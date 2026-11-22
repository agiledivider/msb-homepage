#!/usr/bin/env bash
# test-roundtrip.sh — prove the backup image backs up and restores (needs Docker).
#
#   pnpm backup:test
#
# Builds Dockerfile.backup, fills throwaway volumes with a small SQLite DB and
# media files, backs up to a throwaway local restic repo, restores into empty
# volumes, and compares. Also checks the fail-fast config check, the restore
# safety rails, and an sftp: repository (a throwaway SSH server on port 23,
# reached through the same .ssh mount as on the server, like a Hetzner Storage
# Box). Everything it creates is removed at the end.
set -euo pipefail
cd "$(dirname "$0")/../.."

IMG=msb-backup:test
P="msb-bk-test-$$"
VOLS=("$P-db" "$P-media" "$P-repo" "$P-db2" "$P-media2" "$P-ssh")
fail() { printf '\033[31mFAIL\033[0m %s\n' "$*" >&2; exit 1; }
pass() { printf '\033[32mok\033[0m   %s\n' "$*"; }
cleanup() {
  docker rm -f "$P-sftp" "$P-sched" >/dev/null 2>&1 || true
  docker network rm "$P-net" >/dev/null 2>&1 || true
  docker volume rm -f "${VOLS[@]}" >/dev/null 2>&1 || true
}
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

# 7. sftp: repository through the mounted .ssh dir (key, known_hosts, config),
#    like a Hetzner Storage Box: SSH on port 23, read-only mount, uid 1001.
docker network create "$P-net" >/dev/null
docker build -q -t msb-sftp:test - >/dev/null <<'DOCKERFILE'
FROM alpine:3.22
RUN apk add --no-cache openssh-server openssh-sftp-server && ssh-keygen -A \
  && adduser -D box && echo 'box:*' | chpasswd -e
DOCKERFILE
docker run --rm -u 0 -v "$P-ssh:/ssh" --entrypoint sh "$IMG" -c '
  ssh-keygen -q -t ed25519 -N "" -f /ssh/id_ed25519
  printf "Host storagebox\n  HostName %s\n  User box\n  Port 23\n  IdentityFile ~/.ssh/id_ed25519\n" "$1" > /ssh/config' \
  sh "$P-sftp" >/dev/null
docker run --rm -u 0 -v "$P-ssh:/ssh" --entrypoint sh "$IMG" -c 'chown -R 1001:1001 /ssh && chmod 700 /ssh' >/dev/null
pub=$(docker run --rm -v "$P-ssh:/ssh:ro" --entrypoint cat "$IMG" /ssh/id_ed25519.pub)
docker run -d --name "$P-sftp" --network "$P-net" -e PUB="$pub" msb-sftp:test sh -c '
  mkdir -p /home/box/.ssh && echo "$PUB" > /home/box/.ssh/authorized_keys
  chown -R box /home/box/.ssh && chmod 700 /home/box/.ssh && exec /usr/sbin/sshd -D -e -p 23' >/dev/null
docker run --rm -u 0 --network "$P-net" -v "$P-ssh:/ssh" --entrypoint sh "$IMG" -c '
  for i in $(seq 50); do ssh-keyscan -p 23 "$1" > /ssh/known_hosts 2>/dev/null && [ -s /ssh/known_hosts ] && break; sleep 0.2; done
  chown 1001:1001 /ssh/known_hosts' sh "$P-sftp" >/dev/null
SFTP=(--network "$P-net" -e RESTIC_REPOSITORY=sftp:storagebox:msb-homepage -e RESTIC_PASSWORD=roundtrip-test-only
  -v "$P-ssh:/home/backup/.ssh:ro" -v "$P-db:/volumes/db" -v "$P-media:/volumes/media")
docker run --rm "${SFTP[@]}" "$IMG" backup >/dev/null || fail "backup to the sftp repository failed"
snaps=$(docker run --rm "${SFTP[@]}" "$IMG" snapshots | grep -c msb-homepage || true)
[[ $snaps == 1 ]] || fail "expected 1 snapshot in the sftp repository, got $snaps"
docker exec "$P-sftp" test -f /home/box/msb-homepage/config || fail "sftp repository not in the box user's home"
pass "backup to an sftp: repository (port 23, key from the read-only .ssh mount)"

# 8. The scheduler starts the internal API for the CMS backups view (E8):
#    it refuses to start without a token, lists the snapshots for the right
#    token and nothing for a wrong one.
out=$(docker run --rm "${ENV[@]}" -v "$P-repo:/repo" "$IMG" schedule 2>&1 || true)
[[ $out == *BACKUP_API_TOKEN* ]] || fail "schedule without BACKUP_API_TOKEN was not refused: $out"
docker run -d --name "$P-sched" --network "$P-net" "${ENV[@]}" -e BACKUP_API_TOKEN=api-test-only \
  -v "$P-db:/volumes/db" -v "$P-media:/volumes/media" -v "$P-repo:/repo" "$IMG" schedule >/dev/null
api() { # api <token>: GET /backups from another container on the network, prints "<status> <body>"
  docker run --rm --network "$P-net" --entrypoint sh "$IMG" -c '
    for i in $(seq 50); do
      out=$(curl -s -m 30 -w " %{http_code}" -H "X-Backup-Token: $2" "http://$1:8081/backups") && break; sleep 0.2
    done
    printf "%s" "$out"' sh "$P-sched" "$1"
}
ok=$(api api-test-only)
[[ $ok == *" 200" && $(grep -o '"shortId"' <<<"$ok" | wc -l | tr -d ' ') == 2 ]] || fail "API did not list the 2 snapshots: $ok"
[[ $(api wrong-token) == *" 401" ]] || fail "API accepted a wrong token"
pass "scheduler serves the backups API: lists snapshots for the token, 401 otherwise, refuses to start without one"

echo "backup round trip: all checks passed"
