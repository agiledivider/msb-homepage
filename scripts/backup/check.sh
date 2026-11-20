#!/usr/bin/env bash
# check.sh — verify the off-server backups from your own machine (needs Docker).
#
#   pnpm backup:check                 list snapshots, check the latest one's age,
#                                     read and verify a sample of the data
#   pnpm backup:check --restore DIR   also restore the latest snapshot into DIR
#
# Uses the official restic image, so restic need not be installed. Reads the
# same settings as the server from your environment, by name only:
#   RESTIC_REPOSITORY, RESTIC_PASSWORD   required
#   AWS_*, B2_*, …                       whatever the backend needs
#   BACKUP_CHECK_SUBSET                  share of data to read (default 10%)
#   BACKUP_MAX_AGE_HOURS                 newest snapshot must be younger (default 36)
set -euo pipefail

RESTIC_IMAGE=restic/restic:0.18.1
SUBSET="${BACKUP_CHECK_SUBSET:-10%}"
MAX_AGE_H="${BACKUP_MAX_AGE_HOURS:-36}"
restore_dir=''

die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
step() { printf '\n\033[36m[backup:check]\033[0m %s\n' "$1"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --restore) [ $# -ge 2 ] || die "--restore needs a directory"; restore_dir=$2; shift 2 ;;
    *) die "unknown option $1 (usage: pnpm backup:check [--restore DIR])" ;;
  esac
done

missing=()
[ -n "${RESTIC_REPOSITORY:-}" ] || missing+=(RESTIC_REPOSITORY)
[ -n "${RESTIC_PASSWORD:-}" ] || missing+=(RESTIC_PASSWORD)
[ ${#missing[@]} -eq 0 ] || die "set ${missing[*]} in your shell (same values as on the server)"
command -v jq >/dev/null || die "jq is required"

# Forward settings by name, so no value ends up on a command line.
args=(--rm -e RESTIC_REPOSITORY -e RESTIC_PASSWORD -e RESTIC_CACHE_DIR=/tmp/restic-cache)
while IFS= read -r name; do args+=(-e "$name"); done < <(compgen -e | grep -E '^(AWS_|B2_|AZURE_|GOOGLE_|OS_|RCLONE_)' || true)
# A local repository path (e.g. a mounted NAS) is mounted at the same path.
if [[ $RESTIC_REPOSITORY == /* ]]; then
  [ -d "$RESTIC_REPOSITORY" ] || die "local repository $RESTIC_REPOSITORY does not exist"
  args+=(-v "$RESTIC_REPOSITORY:$RESTIC_REPOSITORY") # rw: check writes a lock
fi
restic() { docker run "${args[@]}" "$@" "$RESTIC_IMAGE" "${RESTIC_ARGS[@]}"; }

step "snapshots"
RESTIC_ARGS=(snapshots --tag msb); restic
latest=$(RESTIC_ARGS=(snapshots --tag msb --latest 1 --json); restic | jq -r 'max_by(.time) | .time // empty')
[ -n "$latest" ] || die "the repository has no backups"
age_h=$(node -e 'console.log(Math.floor((Date.now() - Date.parse(process.argv[1])) / 36e5))' "$latest")
[ "$age_h" -le "$MAX_AGE_H" ] || die "newest backup is ${age_h}h old (limit ${MAX_AGE_H}h): the nightly backup is not running"
echo "newest backup: $latest (about ${age_h}h ago)"

step "integrity, reading $SUBSET of the data"
RESTIC_ARGS=(check --read-data-subset="$SUBSET"); restic --tmpfs /tmp

if [ -n "$restore_dir" ]; then
  mkdir -p "$restore_dir"
  [ -z "$(ls -A "$restore_dir")" ] || die "$restore_dir is not empty"
  dir=$(cd "$restore_dir" && pwd)
  step "restoring the latest backup into $dir"
  RESTIC_ARGS=(restore latest --tag msb --target /out); restic -v "$dir:/out"
  db=$(find "$dir" -name msb.db | head -1)
  [ -n "$db" ] || die "no msb.db in the restored backup"
  echo "database: $db ($(sqlite3 "$db" 'PRAGMA integrity_check;'), $(sqlite3 "$db" 'select count(*) from pages') pages)"
  echo "media files: $(find "$dir" -path '*volumes/media/*' -type f | wc -l | tr -d ' ')"
fi

printf '\n\033[32mbackups ok\033[0m\n'
