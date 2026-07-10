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

start() {
  if is_running; then
    echo "dev server already running (pid $(cat "$PID_FILE")) on http://localhost:$PORT"
    return 0
  fi
  echo "starting dev server on http://localhost:$PORT ..."
  cd "$ROOT"
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
  if ! is_running; then
    echo "dev server not running"
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
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
  rm -f "$PID_FILE"
  echo "stopped"
}

status() {
  if is_running; then
    echo "running (pid $(cat "$PID_FILE")) on http://localhost:$PORT"
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
