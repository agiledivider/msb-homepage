#!/usr/bin/env bash
#
# dev-server.sh — start/stop/restart the Next.js dev server in the background.
#
# The server runs detached; its PID and logs are kept under .dev-server/ so the
# process can be stopped reliably from a later shell (important here because the
# SQLite DB is locked while the dev server holds it).
#
# Usage: scripts/dev-server.sh {start|stop|restart|status|logs}

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT/.dev-server"
PID_FILE="$RUN_DIR/dev.pid"
LOG_FILE="$RUN_DIR/dev.log"
PORT="${PORT:-3000}"

mkdir -p "$RUN_DIR"

is_running() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# PIDs listening on our port (empty if none, or if lsof is unavailable).
port_pids() {
  command -v lsof >/dev/null 2>&1 || return 0
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | sort -u
}

# Is a given PID one of *our* dev-server processes (Next), not some unrelated
# service that merely happens to hold the port? Guards the port-based cleanup so
# we never kill a foreign process that just happens to sit on $PORT.
is_our_server() {
  case "$(ps -o command= -p "$1" 2>/dev/null)" in
    *next*|*"$ROOT"*) return 0 ;;
    *) return 1 ;;
  esac
}

# Port listeners that are ours (Next) vs. some other service.
our_port_pids()     { local p; for p in $(port_pids); do is_our_server "$p" && echo "$p"; done; }
foreign_port_pids() { local p; for p in $(port_pids); do is_our_server "$p" || echo "$p"; done; }

# One-line description of a foreign holder, for warnings.
describe_pids() {
  local p
  for p in "$@"; do echo "    pid $p: $(ps -o command= -p "$p" 2>/dev/null | cut -c1-80)"; done
}

# Safety net: reap any orphaned Next server still holding the port. The recorded
# PID is pnpm's, not next-server's, so a stale/reused PID file can leave the real
# listener running after a crash or a botched restart — pid-based stop misses it.
# Sets REAPED to the number of our processes it terminated; leaves foreign ones be.
kill_port_listeners() {
  REAPED=0
  local pid
  for pid in $(our_port_pids); do
    kill -TERM "$pid" 2>/dev/null && REAPED=$((REAPED + 1))
  done
  [ "$REAPED" -gt 0 ] || return 0
  for _ in $(seq 1 20); do
    [ -n "$(our_port_pids)" ] || break
    sleep 0.25
  done
  for pid in $(our_port_pids); do kill -KILL "$pid" 2>/dev/null || true; done
}

start() {
  if is_running; then
    echo "dev server already running (pid $(cat "$PID_FILE")) on http://localhost:$PORT"
    return 0
  fi
  # A stale PID file plus a live listener = orphan; clean it so the port is free.
  if [ -n "$(port_pids)" ]; then
    echo "port $PORT is busy (orphaned server?) — reaping before start ..."
    kill_port_listeners
  fi
  cd "$ROOT"
  # The dev DB is built by migrations, like the servers' (D-010): apply new ones first.
  echo "applying migrations ..."
  pnpm payload migrate >"$LOG_FILE" 2>&1 || { echo "migrations failed — see $LOG_FILE" >&2; exit 1; }
  echo "starting dev server on http://localhost:$PORT ..."
  # Run detached so it survives this shell; logs go to the log file.
  PORT="$PORT" nohup pnpm dev >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1
  if is_running; then
    echo "started (pid $(cat "$PID_FILE")). Logs: scripts/dev-server.sh logs"
  else
    echo "failed to start — see $LOG_FILE" >&2
    exit 1
  fi
}

stop() {
  local pid stopped=0
  if is_running; then
    pid="$(cat "$PID_FILE")"
    echo "stopping dev server (pid $pid) ..."
    # Kill the whole process group so Next's child workers go down too.
    kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      is_running || break
      sleep 0.25
    done
    if is_running; then
      echo "forcing stop ..."
      kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
    stopped=1
  fi
  rm -f "$PID_FILE"
  # Always sweep the port, even if the PID file said "not running": a stale PID
  # file can leave an orphaned Next listener that pid-based stop would never touch.
  if [ -n "$(our_port_pids)" ]; then
    echo "reaping orphaned server on port $PORT ..."
    kill_port_listeners
    [ "$REAPED" -gt 0 ] && stopped=1
  fi
  if [ "$stopped" = 1 ]; then
    echo "stopped"
  else
    echo "dev server not running"
  fi
  # A foreign process on our port isn't ours to kill — surface it so the user can decide.
  local foreign
  foreign="$(foreign_port_pids)"
  if [ -n "$foreign" ]; then
    echo "note: port $PORT is held by another (non-Next) process — left untouched:" >&2
    describe_pids $foreign >&2
  fi
}

status() {
  if is_running; then
    echo "running (pid $(cat "$PID_FILE")) on http://localhost:$PORT"
  elif [ -n "$(our_port_pids)" ]; then
    echo "orphaned Next server on port $PORT (pid $(our_port_pids | tr '\n' ' ')) — stale PID file; run 'stop' to clean up"
  elif [ -n "$(foreign_port_pids)" ]; then
    echo "not running — but port $PORT is held by another process:"
    describe_pids $(foreign_port_pids)
  else
    echo "not running"
  fi
}

case "${1:-}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; start ;;
  status)  status ;;
  logs)    tail -f "$LOG_FILE" ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}" >&2
    exit 2
    ;;
esac
