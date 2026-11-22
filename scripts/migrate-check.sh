#!/usr/bin/env bash
#
# migrate-check.sh — run this commit's migrations + prod seed on a COPY of a real
# database, exactly like the container does on start, before an image ships.
#
#   pnpm migrate:check [file]
#
# file: a CMS backup download (msb-backup-….tar.gz.enc, Backups in /admin) or a
#       plain msb.db. Default: the newest ~/Downloads/msb-backup-*.tar.gz.enc.
#       Also settable as MIGRATE_CHECK_DB (used by `pnpm release:app`).
#
# An encrypted download asks for its passphrase (openssl prompt), or reads it
# from BACKUP_PASSPHRASE in the environment. The source file is never changed;
# everything happens in a temp dir that is removed at the end.
#
# Why: on 2026-11-22 new migrations crashed the prod container in a restart
# loop and had to be repaired by hand on the server (docs/runtime-traps.md).
#
set -euo pipefail
cd "$(dirname "$0")/.."

die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
step() { printf '\033[36m[migrate-check]\033[0m %s\n' "$1"; }

SRC="${1:-${MIGRATE_CHECK_DB:-}}"
if [ -z "$SRC" ]; then
  SRC="$(ls -t "$HOME"/Downloads/msb-backup-*.tar.gz.enc 2>/dev/null | head -1 || true)"
  [ -n "$SRC" ] || die "no database to check against. Download a backup in /admin → Backups
       (it lands in ~/Downloads), or pass a path: pnpm migrate:check path/to/msb.db"
fi
[ -f "$SRC" ] || die "not a file: $SRC"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/msb-migrate-check.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
DB="$TMP/msb.db"

case "$SRC" in
  *.enc)
    step "Decrypting $(basename "$SRC") ($(date -r "$SRC" '+%Y-%m-%d %H:%M'))"
    PASS_ARG=()
    [ -n "${BACKUP_PASSPHRASE:-}" ] && PASS_ARG=(-pass env:BACKUP_PASSPHRASE)
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 "${PASS_ARG[@]}" \
      -in "$SRC" -out "$TMP/b.tar.gz" || die "could not decrypt (wrong passphrase?)"
    tar -xzf "$TMP/b.tar.gz" -C "$TMP" volumes/db/msb.db || die "no volumes/db/msb.db in the backup"
    mv "$TMP/volumes/db/msb.db" "$DB"
    ;;
  *)
    step "Copying $SRC"
    sqlite3 "$SRC" ".backup '$DB'" || die "could not read $SRC as SQLite"
    ;;
esac

applied() { sqlite3 "$DB" "select count(*) from payload_migrations where batch > 0;" 2>/dev/null || echo 0; }
before="$(applied)"
newest="$(sqlite3 "$DB" "select name from payload_migrations order by name desc limit 1;" 2>/dev/null || echo none)"
step "Database has $before migrations, newest: $newest"

mkdir -p "$TMP/media"
export DATABASE_URI="file:$DB" MEDIA_DIR="$TMP/media"
export PAYLOAD_SECRET="${PAYLOAD_SECRET:-migrate-check-only}"
unset INIT_ADMIN_EMAIL INIT_ADMIN_PASSWORD

step "payload migrate"
pnpm -s payload migrate >"$TMP/migrate.log" 2>&1 || { cat "$TMP/migrate.log"; die "migrations FAILED on this database — don't release"; }
grep -qi "error" "$TMP/migrate.log" && { cat "$TMP/migrate.log"; die "migrate logged an error — don't release"; }

step "prod seed (src/seed/prod.ts)"
pnpm -s payload run src/seed/prod.ts >"$TMP/seed.log" 2>&1 || { cat "$TMP/seed.log"; die "prod seed FAILED on this database — don't release"; }

after="$(applied)"
step "OK — $((after - before)) new migration(s) applied cleanly, prod seed ran"
