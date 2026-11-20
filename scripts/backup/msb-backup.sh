#!/bin/sh
# msb-backup — nightly off-server backup of the CMS database and uploaded media.
#
# Runs in the `backup` service of docker-compose.prod.yml (Dockerfile.backup).
# restic does the storage: encrypted, deduplicated, any restic backend
# (S3, Backblaze B2, SFTP / Hetzner Storage Box, a REST server, a local path).
#
#   msb-backup schedule              default: back up every day at $BACKUP_AT
#   msb-backup backup                one backup now
#   msb-backup snapshots             list the backups in the repository
#   msb-backup restore [ID] [--apply] [--overwrite]
#                                    restore snapshot ID (default: latest);
#                                    without --apply it only shows the plan
#
# Volumes (mounted by compose):
#   /volumes/db     the app's `db` volume     (msb.db)
#   /volumes/media  the app's `media` volume  (uploads)
#
# Env:
#   RESTIC_REPOSITORY, RESTIC_PASSWORD   required (plus the backend's own
#                                        credentials, e.g. AWS_ACCESS_KEY_ID)
#   BACKUP_AT        daily time, HH:MM in $TZ          (default 03:30)
#   BACKUP_KEEP      restic forget policy              (default 7 daily, 4 weekly, 12 monthly)
#   BACKUP_PING_URL  optional healthchecks-style URL: pinged at start (/start),
#                    on success, and on failure (/fail)
set -eu

DB_DIR=/volumes/db
MEDIA_DIR=/volumes/media
DB_FILE=msb.db
WORK=/work
BACKUP_AT="${BACKUP_AT:-03:30}"
BACKUP_KEEP="${BACKUP_KEEP:---keep-daily 7 --keep-weekly 4 --keep-monthly 12}"
BACKUP_PING_URL="${BACKUP_PING_URL:-}"

log() { printf '%s [backup] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# Fail fast, listing every missing setting at once.
require_config() {
  missing=''
  [ -n "${RESTIC_REPOSITORY:-}" ] || missing="$missing RESTIC_REPOSITORY"
  [ -n "${RESTIC_PASSWORD:-}" ] || missing="$missing RESTIC_PASSWORD"
  if ! printf '%s' "$BACKUP_AT" | grep -Eq '^([01][0-9]|2[0-3]):[0-5][0-9]$'; then
    missing="$missing BACKUP_AT(HH:MM, got '$BACKUP_AT')"
  fi
  [ -z "$missing" ] || die "missing or invalid settings:$missing"
}

ping() { # ping <suffix>; never fails the backup, never hangs
  [ -n "$BACKUP_PING_URL" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${BACKUP_PING_URL}$1" || log "ping ${1:-success} failed (ignored)"
}

# Create the repository on first use; afterwards this only proves access.
ensure_repo() {
  if ! restic cat config >/dev/null 2>&1; then
    log "repository not initialised yet, creating it"
    restic init >/dev/null || die "cannot open or create the restic repository (check RESTIC_REPOSITORY and credentials)"
  fi
}

do_backup() {
  [ -f "$DB_DIR/$DB_FILE" ] || die "no database at $DB_DIR/$DB_FILE"
  rm -rf "$WORK/db" && mkdir -p "$WORK/db"

  # Online, consistent copy: sqlite's backup API, safe while the app runs.
  sqlite3 "$DB_DIR/$DB_FILE" ".backup '$WORK/db/$DB_FILE'"
  check=$(sqlite3 "$WORK/db/$DB_FILE" 'PRAGMA integrity_check;')
  [ "$check" = ok ] || die "database snapshot failed the integrity check: $check"

  restic unlock >/dev/null 2>&1 || true # only removes stale locks
  restic backup --host msb-homepage --tag msb "$WORK/db" "$MEDIA_DIR"
  # shellcheck disable=SC2086  # BACKUP_KEEP is a list of flags
  restic forget --host msb-homepage --tag msb $BACKUP_KEEP --prune
  restic check
  rm -rf "$WORK/db"
}

run_backup() {
  ping /start
  # A separate process: `set -e` does not apply inside an `if` condition.
  if "$0" backup-once; then
    log "backup finished"
    ping ''
  else
    log "BACKUP FAILED"
    ping /fail
    return 1
  fi
}

schedule() {
  trap 'log "stopping"; exit 0' TERM INT
  log "daily backup at $BACKUP_AT ($TZ); repository ok"
  last=''
  while :; do
    now=$(date +%H:%M) today=$(date +%F)
    if [ "$now" = "$BACKUP_AT" ] && [ "$last" != "$today" ]; then
      last=$today
      run_backup || true # a failed night must not stop the next one
    fi
    sleep 20 &
    wait $! || true
  done
}

restore() {
  id=latest apply=0 overwrite=0
  for arg in "$@"; do
    case "$arg" in
      --apply) apply=1 ;;
      --overwrite) overwrite=1 ;;
      -*) die "unknown option $arg" ;;
      *) id=$arg ;;
    esac
  done

  restic snapshots --host msb-homepage --tag msb "$id" >/dev/null 2>&1 || die "no snapshot '$id' (see: msb-backup snapshots)"
  restic snapshots --host msb-homepage --tag msb "$id"

  has_db=0 has_media=0
  [ -f "$DB_DIR/$DB_FILE" ] && has_db=1
  [ -n "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ] && has_media=1
  if [ $((has_db + has_media)) -gt 0 ] && [ $overwrite -eq 0 ]; then
    die "the volumes are not empty (database: $has_db, media: $has_media). Add --overwrite to replace them; the current database is kept as $DB_FILE.before-restore-<time>."
  fi

  if [ $apply -eq 0 ]; then
    log "plan: restore snapshot '$id' into $DB_DIR and $MEDIA_DIR (overwrite: $overwrite)"
    log "nothing changed. Stop the web service, then re-run with --apply."
    return 0
  fi

  tmp="$WORK/restore"
  rm -rf "$tmp" && mkdir -p "$tmp"
  restic restore "$id" --host msb-homepage --tag msb --target "$tmp"
  restored_db="$tmp$WORK/db/$DB_FILE"
  [ -f "$restored_db" ] || die "snapshot has no database"
  check=$(sqlite3 "$restored_db" 'PRAGMA integrity_check;')
  [ "$check" = ok ] || die "restored database failed the integrity check: $check"

  if [ $has_db -eq 1 ]; then
    keep="$DB_DIR/$DB_FILE.before-restore-$(date +%Y%m%d-%H%M%S)"
    mv "$DB_DIR/$DB_FILE" "$keep"
    log "previous database kept as $keep"
  fi
  # Copy, then rename: the app never sees a half-written database.
  cp "$restored_db" "$DB_DIR/.$DB_FILE.restoring"
  mv "$DB_DIR/.$DB_FILE.restoring" "$DB_DIR/$DB_FILE"
  if [ -d "$tmp$MEDIA_DIR" ]; then
    cp -a "$tmp$MEDIA_DIR/." "$MEDIA_DIR/"
  fi
  rm -rf "$tmp"
  log "restored snapshot '$id'. Start the web service again."
}

cmd="${1:-schedule}"
[ $# -gt 0 ] && shift
case "$cmd" in
  schedule) require_config; ensure_repo; schedule ;;
  backup) require_config; ensure_repo; run_backup ;;
  backup-once) do_backup ;; # internal, called by run_backup
  snapshots) require_config; restic snapshots --host msb-homepage --tag msb ;;
  restore) require_config; restore "$@" ;;
  *) die "unknown command '$cmd' (schedule | backup | snapshots | restore)" ;;
esac
