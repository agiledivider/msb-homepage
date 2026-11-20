#!/usr/bin/env bash
# test-roundtrip.sh — prove the backup image backs up and restores (needs Docker).
#
#   pnpm backup:test
#
# Builds Dockerfile.backup, fills throwaway volumes with a small SQLite DB and
# media files, backs up to a throwaway local restic repo, restores into empty
# volumes, and compares. Also checks the fail-fast config check and the restore
# safety rails. Everything it creates is removed at the end.
set -euo pipefail
cd "$(dirname "$0")/../.."

IMG=msb-backup:test
P="msb-bk-test-$$"
VOLS=("$P-db" "$P-media" "$P-repo" "$P-db2" "$P-media2")
fail() { printf '\033[31mFAIL\033[0m %s\n' "$*" >&2; exit 1; }
pass() { printf '\033[32mok\033[0m   %s\n' "$*"; }
cleanup() { docker volume rm -f "${VOLS[@]}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker build -q -f Dockerfile.backup -t "$IMG" . >/dev/null
for v in "${VOLS[@]}"; do docker volume create "$v" >/dev/null; done

ENV=(-e RESTIC_REPOSITORY=/repo -e RESTIC_PASSWORD=roundtrip-test-only)
run() { # run <db-vol> <media-vol> <args...>
  local db=$1 media=$2; shift 2
  docker run --rm "${ENV[@]}" -v "$db:/volumes/db" -v "$media:/volumes/media" -v "$P-repo:/repo" "$IMG" "$@"
}
shell() { # shell <db-vol> <media-vol> <script>: same mounts, plain sh
  docker run --rm -v "$1:/volumes/db" -v "$2:/volumes/media" --entrypoint sh "$IMG" -c "$3"
}

# 1. Fail fast: both missing settings are named at once.
out=$(docker run --rm "$IMG" backup 2>&1 || true)
[[ $out == *RESTIC_REPOSITORY* && $out == *RESTIC_PASSWORD* ]] || fail "missing config not reported: $out"
pass "refuses to run without config, names every missing setting"

# 2. Source data: a DB with a few rows, two media files (one in a subfolder).
shell "$P-db" "$P-media" '
  sqlite3 /volumes/db/msb.db "create table pages(id integer primary key, title text);
    insert into pages(title) values (\"Verein\"),(\"Werkzeug\"),(\"Mitmachen\");"
  mkdir -p /volumes/media/sub && echo hero > /volumes/media/hero.webp && echo pdf > /volumes/media/sub/satzung.pdf'

run "$P-db" "$P-media" backup >/dev/null
snaps=$(run "$P-db" "$P-media" snapshots | grep -c msb-homepage || true)
[[ $snaps == 1 ]] || fail "expected 1 snapshot, got $snaps"
pass "backup creates a snapshot (repository initialised on first use)"

# 3. Restore is a dry run without --apply.
run "$P-db2" "$P-media2" restore >/dev/null
[[ -z $(shell "$P-db2" "$P-media2" 'ls -A /volumes/db /volumes/media | grep -v : | grep .' || true) ]] \
  || fail "dry run changed the volumes"
pass "restore without --apply changes nothing"

# 4. Restore into empty volumes, compare content.
run "$P-db2" "$P-media2" restore --apply >/dev/null
fingerprint='sqlite3 /volumes/db/msb.db .dump; cd /volumes/media && find . -type f | sort | xargs sha256sum; stat -c %u /volumes/db/msb.db'
[[ $(shell "$P-db" "$P-media" "$fingerprint") == "$(shell "$P-db2" "$P-media2" "$fingerprint")" ]] \
  || fail "restored data differs from the original"
pass "restore onto empty volumes reproduces DB and media exactly (owned by uid 1001)"

# 5. Restoring over existing data needs --overwrite and keeps the old DB.
out=$(run "$P-db2" "$P-media2" restore --apply 2>&1 || true)
[[ $out == *"not empty"* ]] || fail "restore over existing data was not refused: $out"
run "$P-db2" "$P-media2" restore --apply --overwrite >/dev/null
kept=$(shell "$P-db2" "$P-media2" 'ls /volumes/db | grep -c before-restore')
[[ $kept == 1 ]] || fail "previous DB not kept (found $kept copies)"
pass "restore over existing data needs --overwrite and keeps the previous DB"

# 6. A second backup of unchanged data adds no new data to the repository.
added=$(run "$P-db" "$P-media" backup | grep -o 'Added to the repository: [0-9.]* [A-Za-z]*' | tail -1)
[[ $added =~ :\ 0(\.[0-9]+)?\ B$ || $added =~ :\ [0-9.]+\ (B|KiB)$ ]] || fail "unchanged second backup stored new data: $added"
pass "second backup of unchanged data stores (almost) nothing new ($added)"

echo "backup round trip: all checks passed"
