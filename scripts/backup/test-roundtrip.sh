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
VOLS=("$P-db" "$P-media" "$P-repo" "$P-db2" "$P-media2" "$P-ssh" "$P-dl")
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

# 7b. The backups view's storage figures (S9.2) over the same sftp setup: used
#     space from restic, size and free space from the server's `df`.
storage=$(docker run --rm "${SFTP[@]}" --entrypoint sh "$IMG" -c '
  export BACKUP_API_TOKEN=api-test-only
  node /usr/local/lib/msb/backup-api.mjs >/dev/null 2>&1 &
  for i in $(seq 50); do curl -sf -H "X-Backup-Token: api-test-only" localhost:8081/status >/dev/null && break; sleep 0.2; done
  curl -s -H "X-Backup-Token: api-test-only" localhost:8081/backups' | node -e '
  let d = ""; process.stdin.on("data", (c) => (d += c)).on("end", () => {
    const s = JSON.parse(d).storage
    console.log(s && s.usedBytes > 0 && s.totalBytes > 0 && s.freeBytes > 0 ? "ok" : JSON.stringify(s))
  })')
[[ $storage == ok ]] || fail "storage figures over sftp: $storage"
pass "storage figures over sftp (used from restic, size and free from df)"

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
# S9.3: the second backup (step 6, nothing changed in between) is marked unchanged by restic diff.
[[ $(grep -o '"unchanged":[a-z]*' <<<"$ok" | tr '\n' ' ') == '"unchanged":true "unchanged":null ' ]] ||
  fail "second backup of unchanged data not marked unchanged: $ok"
pass "the second backup of unchanged data is marked unchanged (restic diff), the oldest has nothing to compare"

# 9. A backup started through the API (S8.5): runs once, a second start while
#    it runs is refused, and the finished run records who started it.
call() { # call <method> <path> [body]: prints "<body> <status>" from inside the network
  docker run --rm --network "$P-net" --entrypoint sh "$IMG" -c '
    curl -s -m 30 -w " %{http_code}" -X "$2" -H "X-Backup-Token: api-test-only" -H "Content-Type: application/json" \
      ${4:+--data "$4"} "http://$1:8081$3"' sh "$P-sched" "$1" "$2" "${3-}"
}
newest() { call GET /backups | grep -o '"shortId":"[0-9a-f]*"' | head -1; }
before=$(newest)
[[ $(call POST /backups '{"by":"admin@test.de"}') == *" 202" ]] || fail "API did not start a backup"
second=$(call POST /backups '{"by":"other@test.de"}')
[[ $second == *" 409" && $second == *admin@test.de* ]] || fail "second start while running was not refused: $second"
for _ in $(seq 120); do
  status=$(call GET /status)
  [[ $status == *'"running":null'* && $status == *'"by":"admin@test.de"'* ]] && break
  sleep 1
done
[[ $status == *'"status":"ok"'* && $status == *'"by":"admin@test.de"'* ]] || fail "manual backup did not finish as recorded: $status"
# (Retention keeps one snapshot per day, so the count stays; the newest one changes.)
after=$(newest)
[[ -n $after && $after != "$before" ]] || fail "manual backup is not the newest snapshot ($before → $after)"
pass "backup started through the API: runs once, refuses a second start, records who started it"

# 10. Download (S8.2): the newest backup comes out as one file encrypted with
#     the passphrase; plain openssl (another image) opens it with the command
#     the admin is shown, and inside are an intact database and the media.
#     No passphrase, or an unknown id, gets nothing.
PASS=k7mq-x3pz-9cdr-wv4h-tn2e-fa8b
id=$(newest | grep -o '[0-9a-f]\{8\}')
dl() { # dl <id> <json body>: POST the download into the dl volume, prints headers + status
  docker run --rm --network "$P-net" -v "$P-dl:/dl" -u 0 --entrypoint sh "$IMG" -c '
    curl -s -m 120 -D - -o /dl/b.enc -w "status:%{http_code}" -X POST -H "X-Backup-Token: api-test-only" \
      -H "Content-Type: application/json" --data "$3" "http://$1:8081/backups/$2/download" | tr -d "\r"' \
    sh "$P-sched" "$1" "$2"
}
[[ $(dl "$id" '{}') == *status:400 ]] || fail "download without a passphrase was not refused"
[[ $(dl deadbeef "{\"passphrase\":\"$PASS\"}") == *status:404 ]] || fail "unknown backup id was not a 404"
head=$(dl "$id" "{\"passphrase\":\"$PASS\",\"by\":\"admin@test.de\"}")
[[ $head == *status:200 && $head == *"filename=\"msb-backup-"*"Z-$id.tar.gz.enc\""* ]] || fail "download failed: $head"
docker run --rm -v "$P-dl:/dl" alpine:3.22 sh -c "apk add -q openssl >/dev/null && \
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -pass pass:$PASS -in /dl/b.enc -out /dl/b.tar.gz" \
  || fail "openssl could not decrypt the download"
out=$(docker run --rm -v "$P-dl:/dl" -u 0 --entrypoint sh "$IMG" -c '
  cd /dl && tar -xzf b.tar.gz && find . -type f -path "./volumes/media/*" | sort
  sqlite3 work/db/msb.db "PRAGMA integrity_check; select count(*) from pages;"
  grep -c "Verein" b.enc || true')
[[ $out == *./volumes/media/hero.webp* && $out == *./volumes/media/sub/satzung.pdf* ]] || fail "download lacks the media: $out"
[[ $out == *$'ok\n3\n0' ]] || fail "database not intact, or plain text visible in the encrypted file: $out"
docker logs "$P-sched" 2>&1 | grep -q "backup $id downloaded (encrypted) by admin@test.de" || fail "download not logged with who"
pass "download: encrypted with the passphrase, opens with plain openssl, intact DB and all media, logged; no passphrase → 400"

# 11. Restore while the service runs (S8.3): change the live data after the
#     newest backup, preview, restore with the backup's id as confirmation.
#     The change is gone, a safety backup holds it, and a backup from another
#     version of the site (other migrations) is refused without touching anything.
id=$(newest | grep -o '[0-9a-f]\{8\}')
shell "$P-db" "$P-media" '
  sqlite3 /volumes/db/msb.db "insert into pages(title) values (\"Neu nach dem Backup\");"
  echo extra > /volumes/media/extra.webp && echo changed > /volumes/media/hero.webp
  chown -R 1001:1001 /volumes/db /volumes/media'
preview=$(call GET "/backups/$id/preview")
[[ $preview == *'"compatible":true'* && $preview == *'"backup":{"counts":{"pages":3'* && $preview == *'"live":{"counts":{"pages":4'* ]] \
  || fail "preview does not show backup vs live: $preview"
[[ $(call POST "/backups/$id/restore" '{"confirm":"nope"}') == *" 400" ]] || fail "restore without the right confirmation was not refused"
[[ $(call POST "/backups/$id/restore" "{\"confirm\":\"$id\",\"by\":\"admin@test.de\"}") == *" 202" ]] || fail "restore did not start"
for _ in $(seq 120); do
  status=$(call GET /status)
  [[ $status == *'"running":null'* && $status == *'"lastRestore":{'* ]] && break
  sleep 1
done
[[ $status == *'"lastRestore":{"status":"ok"'* && $status == *"\"snapshot\":\"$id"* && $status == *'"by":"admin@test.de"'* ]] \
  || fail "restore did not finish as recorded: $status"
safety=$(grep -o '"safety":"[0-9a-f]*"' <<<"$status" | cut -d'"' -f4)
after=$(shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "select count(*) from pages;"; ls /volumes/media; cat /volumes/media/hero.webp')
[[ $after == $'3\nhero.webp\nsub\nhero' ]] || fail "live data is not the backup's after restore: $after"
[[ -n $safety ]] || fail "no safety backup recorded: $status"
held=$(docker run --rm "${ENV[@]}" -v "$P-repo:/repo" --entrypoint restic "$IMG" dump "$safety" /work/db/msb.db | \
  docker run --rm -i --entrypoint sh "$IMG" -c 'cat > /tmp/s.db && sqlite3 /tmp/s.db "select count(*) from pages;"')
[[ $held == 4 ]] || fail "safety backup $safety does not hold the state before the restore ($held pages)"
pass "restore while running: preview, confirmation, live data back to the backup, safety backup holds what was replaced"

shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "create table payload_migrations(id integer primary key, name text);
  insert into payload_migrations(name) values (\"20991231_future\");"; chown -R 1001:1001 /volumes/db'
[[ $(call POST "/backups/$id/restore" "{\"confirm\":\"$id\"}") == *" 202" ]] || fail "second restore did not start"
for _ in $(seq 60); do status=$(call GET /status); [[ $status == *'"running":null'* ]] && break; sleep 1; done
[[ $status == *'"lastRestore":{"status":"failed"'* && $status == *'"code":"other-version"'* ]] || fail "restore across versions was not refused: $status"
[[ $(shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "select name from payload_migrations;"') == 20991231_future ]] \
  || fail "refused restore changed the live database"
pass "restore of a backup from another version is refused and changes nothing"

run "$P-db" "$P-media" backup >/dev/null
run "$P-db" "$P-media" snapshots | grep -q "^$safety" || fail "safety backup $safety was pruned by the next backup"
pass "safety backups survive the regular cleanup (tag before-restore)"

# 12. Restore from an uploaded file (S8.4): the encrypted download from step 10
#     goes back in. Wrong password is refused and the file kept for a retry;
#     the right one previews and restores it. A file that isn't ours, and a
#     crafted archive (".." entry, symlink), are refused without unpacking.
shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "drop table payload_migrations; insert into pages(title) values (\"Neu vor dem Upload\");"
  chown -R 1001:1001 /volumes/db'
up() { # up <file in the dl volume>: POST it as an upload, prints "<body> <status>"
  docker run --rm --network "$P-net" -v "$P-dl:/dl:ro" --entrypoint sh "$IMG" -c '
    curl -s -m 120 -w " %{http_code}" -H "X-Backup-Token: api-test-only" -H "Content-Type: application/octet-stream" \
      --data-binary "@/dl/$2" "http://$1:8081/uploads"' sh "$P-sched" "$1"
}
res=$(up b.enc)
[[ $res == *" 201" ]] || fail "upload was not taken: $res"
upload=$(grep -o '"uploadId":"[0-9a-f]*"' <<<"$res" | cut -d'"' -f4)
[[ $(call POST "/uploads/$upload/check" '{"passphrase":"wrong-wrong-wrong-wrong"}') == *'"code":"wrong-password"'*" 422" ]] \
  || fail "a wrong password was not refused"
checked=$(call POST "/uploads/$upload/check" "{\"passphrase\":\"$PASS\"}")
[[ $checked == *'"compatible":true'* && $checked == *'"backup":{"counts":{"pages":3'* && $checked == *'"live":{"counts":{"pages":4'* && $checked == *" 200" ]] \
  || fail "upload with the right password was not previewed (file not kept after the wrong one?): $checked"
[[ $(call POST "/uploads/$upload/restore" "{\"confirm\":\"$upload\",\"by\":\"admin@test.de\"}") == *" 202" ]] || fail "upload restore did not start"
for _ in $(seq 120); do status=$(call GET /status); [[ $status == *'"running":null'* ]] && break; sleep 1; done
[[ $status == *'"lastRestore":{"status":"ok"'* && $status == *'"source":"upload"'* && $status == *"\"snapshot\":\"$upload\""* ]] \
  || fail "upload restore did not finish as recorded: $status"
[[ $(shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "select count(*) from pages;"; ls /tmp >/dev/null') == 3 ]] \
  || fail "live data is not the uploaded backup's"
[[ $(docker exec "$P-sched" sh -c 'ls -A /work/uploads 2>/dev/null | wc -l') == 0 ]] || fail "the upload was not cleaned up"
pass "upload: wrong password refused (file kept), right one previewed and restored, upload removed afterwards"

docker run --rm -v "$P-dl:/dl" -u 0 alpine:3.22 sh -c "apk add -q openssl >/dev/null
  echo 'not a backup' > /dl/plain.enc
  mkdir -p /tmp/e/volumes/media && cd /tmp/e && echo x > volumes/media/a.webp && ln -s /work volumes/media/link
  tar -czf /tmp/link.tar.gz volumes && cd / && echo evil > /tmp/evil && tar -czf /tmp/dots.tar.gz -C /tmp/e volumes/media/a.webp ../evil 2>/dev/null
  for f in link dots; do openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -pass pass:$PASS -in /tmp/\$f.tar.gz -out /dl/\$f.enc; done"
for f in plain link dots; do
  res=$(up "$f.enc"); upload=$(grep -o '"uploadId":"[0-9a-f]*"' <<<"$res" | cut -d'"' -f4)
  [[ $(call POST "/uploads/$upload/check" "{\"passphrase\":\"$PASS\"}") == *'"code":"not-a-backup"'*" 422" ]] \
    || fail "$f.enc was not refused as not-a-backup"
done
[[ $(docker exec "$P-sched" sh -c 'ls /work/evil /work/uploads/evil 2>/dev/null | wc -l; ls -A /work/uploads | wc -l') == $'0\n0' ]] \
  || fail "a refused upload left files behind"
pass "upload: a file that isn't a backup, and crafted archives (symlink, ..), are refused and leave nothing"

# 13. A dev backup onto a server (Falk, 2026-11-22): dev records only "dev" in
#     payload_migrations, the server the real migration names. Same structure,
#     so it restores, and the server keeps its own migration history. A real
#     structural difference (extra column) is refused and named in the preview.
shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "create table payload_migrations(id integer primary key, name text, batch numeric);
  insert into payload_migrations(name, batch) values (\"dev\", -1);"; chown -R 1001:1001 /volumes/db'
run "$P-db" "$P-media" backup >/dev/null
devsnap=$(newest | grep -o '[0-9a-f]\{8\}')
shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "delete from payload_migrations;
  insert into payload_migrations(name, batch) values (\"20260101_000000_a\", 1), (\"20260102_000000_b\", 2);
  insert into pages(title) values (\"Nur auf dem Server\");"; chown -R 1001:1001 /volumes/db'
preview=$(call GET "/backups/$devsnap/preview")
[[ $preview == *'"compatible":true'* && $preview == *'"differences":[]'* ]] || fail "dev backup not seen as compatible: $preview"
[[ $(call POST "/backups/$devsnap/restore" "{\"confirm\":\"$devsnap\"}") == *" 202" ]] || fail "dev backup restore did not start"
for _ in $(seq 120); do status=$(call GET /status); [[ $status == *'"running":null'* ]] && break; sleep 1; done
[[ $status == *'"lastRestore":{"status":"ok"'* ]] || fail "dev backup restore failed: $status"
after=$(shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "select count(*) from pages where title = \"Nur auf dem Server\"; select group_concat(name) from payload_migrations;"')
[[ $after == $'0\n20260101_000000_a,20260102_000000_b' ]] || fail "content or migration history wrong after a dev restore: $after"
pass "a dev backup restores onto a server with the same structure, and the server keeps its migration history"


shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "alter table pages add column subtitle text;"; chown -R 1001:1001 /volumes/db'
preview=$(call GET "/backups/$devsnap/preview")
[[ $preview == *'"compatible":false'* && $preview == *'"differences":["pages"]'* ]] || fail "structural difference not named: $preview"
call POST "/backups/$devsnap/restore" "{\"confirm\":\"$devsnap\"}" >/dev/null
for _ in $(seq 60); do status=$(call GET /status); [[ $status == *'"running":null'* ]] && break; sleep 1; done
[[ $status == *'"code":"other-version"'* ]] || fail "restore across structures was not refused: $status"
[[ $(shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "select count(*) from pragma_table_info(\"pages\") where name = \"subtitle\";"') == 1 ]] \
  || fail "refused restore changed the live database"
pass "a backup with another structure is refused, names the table (pages), and changes nothing"

# 13b. Since D-010 every database is built by migrations, so a backup brings
#      its own history; it must keep it, not take over the server's (the server's
#      can lag behind its tables, and `payload migrate` would then recreate them).
shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "delete from payload_migrations;
  insert into payload_migrations(name, batch) values (\"20260101_000000_a\", 1), (\"20260102_000000_b\", 1), (\"20260103_000000_c\", 2);"
  chown -R 1001:1001 /volumes/db'
run "$P-db" "$P-media" backup >/dev/null
fullsnap=$(newest | grep -o '[0-9a-f]\{8\}')
shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "delete from payload_migrations;
  insert into payload_migrations(name, batch) values (\"20260101_000000_a\", 1);"; chown -R 1001:1001 /volumes/db'
[[ $(call POST "/backups/$fullsnap/restore" "{\"confirm\":\"$fullsnap\"}") == *" 202" ]] || fail "restore with history did not start"
for _ in $(seq 120); do status=$(call GET /status); [[ $status == *'"running":null'* ]] && break; sleep 1; done
[[ $status == *'"lastRestore":{"status":"ok"'* ]] || fail "restore with history failed: $status"
after=$(shell "$P-db" "$P-media" 'sqlite3 /volumes/db/msb.db "select group_concat(name) from payload_migrations;"')
[[ $after == '20260101_000000_a,20260102_000000_b,20260103_000000_c' ]] || fail "backup lost its migration history: $after"
pass "a backup with its own migration history keeps it"

echo "backup round trip: all checks passed"
