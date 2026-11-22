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
#                                    without --apply it only shows the plan.
#                                    Offline: stop the web service first.
#   msb-backup inspect ID            JSON for the CMS restore preview (S8.3)
#   msb-backup restore-live ID       restore while the site runs (S8.3; the
#                                    CMS starts it): safety backup first, then
#                                    media, then the database via SQLite's
#                                    backup API, which is safe with the app open
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
#   BACKUP_API_TOKEN required by `schedule`: it also starts the internal API the
#                    CMS uses to list backups (backup-api.mjs, port $BACKUP_API_PORT)
set -eu

DB_DIR=/volumes/db
MEDIA_DIR=/volumes/media
DB_FILE=msb.db
WORK=/work
BACKUP_AT="${BACKUP_AT:-03:30}"
BACKUP_KEEP="${BACKUP_KEEP:---keep-daily 7 --keep-weekly 4 --keep-monthly 12}"
BACKUP_PING_URL="${BACKUP_PING_URL:-}"
BACKUP_STATUS_FILE="${BACKUP_STATUS_FILE:-$WORK/last-run.json}"
BACKUP_LOCK_DIR="${BACKUP_LOCK_DIR:-$WORK/backup.lock}"
RESTORE_STATUS_FILE="${RESTORE_STATUS_FILE:-$WORK/last-restore.json}"
export BACKUP_STATUS_FILE BACKUP_LOCK_DIR RESTORE_STATUS_FILE
# Who started this backup (set by the API for a backup started in the CMS,
# S8.5); empty for the nightly run. Kept to email-like characters: it goes into JSON.
BACKUP_BY=$(printf '%s' "${BACKUP_BY:-}" | tr -cd 'A-Za-z0-9@._+-' | cut -c1-120)

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

# Record the last run for the CMS backups view (read by backup-api.mjs).
# Written atomically; it lives in the container, so it's gone after a restart
# and the CMS then shows the last run as unknown.
json_or_null() { if [ -n "$1" ]; then printf '"%s"' "$1"; else printf null; fi; } # only for safe characters
by_json() { json_or_null "$BACKUP_BY"; }

record_run() { # record_run ok|failed
  printf '{"status":"%s","at":"%s","by":%s}\n' "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(by_json)" >"$BACKUP_STATUS_FILE.tmp" &&
    mv "$BACKUP_STATUS_FILE.tmp" "$BACKUP_STATUS_FILE" || log "could not record the run status (ignored)"
}

# One backup at a time, nightly or started in the CMS: mkdir is atomic. The
# lock names its holder's pid, so a lock left by a killed run is taken over.
take_lock() { # take_lock <pid> [backup|restore] [snapshot]
  if ! mkdir "$BACKUP_LOCK_DIR" 2>/dev/null; then
    holder=$(cat "$BACKUP_LOCK_DIR/pid" 2>/dev/null || true)
    if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then return 1; fi
    [ -n "$holder" ] || { sleep 1; [ -s "$BACKUP_LOCK_DIR/pid" ] && return 1; } # its holder is still writing it
    log "taking over a lock left by a backup that no longer runs"
    rm -rf "$BACKUP_LOCK_DIR"
    mkdir "$BACKUP_LOCK_DIR" 2>/dev/null || return 1
  fi
  printf '{"startedAt":"%s","by":%s,"kind":"%s","snapshot":%s}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(by_json)" \
    "${2:-backup}" "$(json_or_null "${3:-}")" >"$BACKUP_LOCK_DIR/info.json"
  echo "$1" >"$BACKUP_LOCK_DIR/pid"
}
drop_lock() { rm -rf "$BACKUP_LOCK_DIR"; }

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
  restic backup --host msb-homepage --tag msb ${BACKUP_EXTRA_TAG:+--tag "$BACKUP_EXTRA_TAG"} "$WORK/db" "$MEDIA_DIR"
  # A safety backup before a restore (S8.3) skips this: its cleanup could
  # remove the very backup that is being restored.
  if [ -z "${BACKUP_SKIP_FORGET:-}" ]; then
    # Pruning needs the repository to itself; a download from the CMS (S8.2)
    # holds a read lock while it streams, so wait for it instead of failing.
    # Safety backups (tag before-restore) are kept, so every restore can be undone.
    # shellcheck disable=SC2086  # BACKUP_KEEP is a list of flags
    restic forget --retry-lock 2h --host msb-homepage --tag msb --keep-tag before-restore $BACKUP_KEEP --prune
    restic check --retry-lock 2h
  fi
  rm -rf "$WORK/db"
}

run_backup() {
  # The lock names a process that lives exactly as long as this backup.
  "$0" backup-locked &
  wait $!
}

backup_locked() {
  take_lock $$ || { log "a backup is already running; not starting another"; exit 75; }
  trap drop_lock EXIT
  log "backup started${BACKUP_BY:+ by $BACKUP_BY}"
  ping /start
  # A separate process: `set -e` does not apply inside an `if` condition.
  if "$0" backup-once; then
    log "backup finished"
    record_run ok
    ping ''
  else
    log "BACKUP FAILED"
    record_run failed
    ping /fail
    exit 1
  fi
}

schedule() {
  [ -n "${BACKUP_API_TOKEN:-}" ] || die "missing setting: BACKUP_API_TOKEN (the CMS backups view needs it)"
  drop_lock # nothing can be running when the container starts
  node /usr/local/lib/msb/backup-api.mjs &
  api=$!
  trap 'log "stopping"; kill $api 2>/dev/null; exit 0' TERM INT
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

# --- Restore while the site runs (S8.3) ------------------------------------

# Content counts of a database, as JSON: what the restore preview shows.
counts_json() { # counts_json <db>
  out=''
  for t in pages blog events media users; do
    n=$(sqlite3 "$1" "select count(*) from $t;" 2>/dev/null || true)
    out="$out${out:+,}\"$t\":${n:-null}"
  done
  printf '{%s}' "$out"
}
# The migrations a database has: a backup fits the running code only if they're the same.
migrations() { sqlite3 "$1" "select name from payload_migrations order by name;" 2>/dev/null || true; }
valid_id() { printf '%s' "$1" | grep -Eq '^[0-9a-f]{8,64}$' || die "invalid snapshot id '$1'"; }

inspect() {
  id=$1
  valid_id "$id"
  tmp="$WORK/inspect-$$"
  rm -rf "$tmp" && mkdir -p "$tmp"
  trap 'rm -rf "$tmp"' EXIT
  restic dump "$id" "$WORK/db/$DB_FILE" >"$tmp/$DB_FILE" || die "snapshot $id has no database"
  integrity=$(sqlite3 "$tmp/$DB_FILE" 'PRAGMA integrity_check;' 2>/dev/null || true)
  compatible=false
  [ "$(migrations "$tmp/$DB_FILE")" = "$(migrations "$DB_DIR/$DB_FILE")" ] && compatible=true
  backup_files=$(restic ls --json --recursive "$id" "$MEDIA_DIR" | grep -c '"type":"file"' || true)
  live_files=$(find "$MEDIA_DIR" -type f | wc -l | tr -d ' ')
  printf '{"integrity":"%s","compatible":%s,"backup":{"counts":%s,"mediaFiles":%s},"live":{"counts":%s,"mediaFiles":%s}}\n' \
    "$([ "$integrity" = ok ] && echo ok || echo damaged)" "$compatible" \
    "$(counts_json "$tmp/$DB_FILE")" "${backup_files:-0}" "$(counts_json "$DB_DIR/$DB_FILE")" "${live_files:-0}"
}

record_restore() { # record_restore ok|failed <snapshot> <safety snapshot or ""> <code> <message>
  printf '{"status":"%s","at":"%s","by":%s,"snapshot":"%s","safety":%s,"code":"%s","message":"%s"}\n' "$1" \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(by_json)" "$2" "$(json_or_null "$3")" "$4" "$5" >"$RESTORE_STATUS_FILE.tmp" &&
    mv "$RESTORE_STATUS_FILE.tmp" "$RESTORE_STATUS_FILE" || log "could not record the restore status (ignored)"
}

restore_live() {
  id=$1 safety=''
  valid_id "$id"
  take_lock $$ restore "$id" || { log "a backup or restore is already running; not restoring"; exit 75; }
  tmp="$WORK/restore-live"
  trap 'rm -rf "$tmp"; drop_lock' EXIT
  abort() { log "RESTORE FAILED: $2"; record_restore failed "$id" "$safety" "$1" "$2"; exit 1; } # abort <code> <message>
  log "restore of $id started${BACKUP_BY:+ by $BACKUP_BY}"

  # 1. Unpack and check the backup next to the live data. Nothing has changed yet.
  rm -rf "$tmp" && mkdir -p "$tmp"
  restic restore "$id" --target "$tmp" >/dev/null || abort unreadable "the backup could not be read; nothing changed"
  db="$tmp$WORK/db/$DB_FILE"
  [ -f "$db" ] || abort no-database "the backup has no database; nothing changed"
  [ "$(sqlite3 "$db" 'PRAGMA integrity_check;')" = ok ] || abort damaged "the database in the backup is damaged; nothing changed"
  [ "$(migrations "$db")" = "$(migrations "$DB_DIR/$DB_FILE")" ] ||
    abort other-version "the backup is from another version of the site (other migrations); nothing changed"

  # 2. A safety backup of the current state, so this restore can be undone.
  BACKUP_EXTRA_TAG=before-restore BACKUP_SKIP_FORGET=1 "$0" backup-once || abort safety-failed "the safety backup failed; nothing changed"
  safety=$(restic snapshots --json --latest 1 --host msb-homepage --tag before-restore |
    grep -o '"short_id":"[0-9a-f]*"' | head -1 | cut -d'"' -f4)
  log "safety backup $safety taken"

  # 3. Media in first: files the restored database points to must exist when it goes live.
  if [ -d "$tmp$MEDIA_DIR" ]; then
    cp -a "$tmp$MEDIA_DIR/." "$MEDIA_DIR/" || abort media-failed "copying the media failed; the database is unchanged (safety backup $safety)"
  fi

  # 4. The database, via SQLite's backup API: atomic, and safe while the app has it open.
  sqlite3 "$DB_DIR/$DB_FILE" ".timeout 60000" ".restore '$db'" ||
    abort database-failed "replacing the database failed; it is unchanged (safety backup $safety)"

  # 5. Only now remove media the backup doesn't have (uploaded after it was taken).
  if [ -d "$tmp$MEDIA_DIR" ]; then
    (cd "$tmp$MEDIA_DIR" && find . -type f | sort) >"$tmp/want"
    (cd "$MEDIA_DIR" && find . -type f | sort) >"$tmp/have"
    comm -13 "$tmp/want" "$tmp/have" | while IFS= read -r f; do rm -f "$MEDIA_DIR/$f"; done
  fi

  record_restore ok "$id" "$safety" restored "restored"
  log "restore of $id finished (safety backup $safety)"
}

cmd="${1:-schedule}"
[ $# -gt 0 ] && shift
case "$cmd" in
  schedule) require_config; ensure_repo; schedule ;;
  backup) require_config; ensure_repo; run_backup ;;
  backup-locked) backup_locked ;; # internal, called by run_backup
  backup-once) do_backup ;; # internal, called by backup_locked
  snapshots) require_config; restic snapshots --host msb-homepage --tag msb ;;
  restore) require_config; restore "$@" ;;
  inspect) require_config; inspect "${1:-}" ;;
  restore-live) require_config; restore_live "${1:-}" ;;
  *) die "unknown command '$cmd' (schedule | backup | snapshots | restore | inspect | restore-live)" ;;
esac
