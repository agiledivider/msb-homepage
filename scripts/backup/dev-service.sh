#!/usr/bin/env bash
# dev-service.sh — run the real backup service next to `pnpm dev`, so the admin
# backups view (/admin/backups, E8) has something to show. Needs Docker.
#
#   pnpm backup:dev           build the image, take one backup now, start the
#                             service with its API on 127.0.0.1:8081
#   pnpm backup:dev stop      stop it (the backups in .backup-dev/ stay)
#
# Backs up the dev msb.db and public/media into a local restic repository in
# .backup-dev/ (gitignored). Reads BACKUP_API_TOKEN from .env by name; the dev
# server needs BACKUP_API_URL=http://127.0.0.1:8081 and the same token there.
# Dev only: the restic password below protects nothing worth protecting.
set -euo pipefail
cd "$(dirname "$0")/../.."

NAME=msb-backup-dev
IMG=msb-backup:dev

if [[ ${1-} == stop ]]; then
  docker rm -f "$NAME" >/dev/null 2>&1 && echo "backup service stopped" || echo "backup service was not running"
  exit 0
fi

token=$(grep -E '^BACKUP_API_TOKEN=' .env 2>/dev/null | tail -1 | cut -d= -f2- || true)
[[ -n $token ]] || { echo "BACKUP_API_TOKEN is not set in .env (see .env.local.example)" >&2; exit 1; }
[[ -f msb.db ]] || { echo "no msb.db here; start the dev server or seed first" >&2; exit 1; }

mkdir -p .backup-dev/repo public/media
docker build -q -f Dockerfile.backup -t "$IMG" . >/dev/null
docker rm -f "$NAME" >/dev/null 2>&1 || true

# The token goes in through an env file, not argv, so it doesn't show in `ps`.
envfile=$(mktemp)
trap 'rm -f "$envfile"' EXIT
chmod 600 "$envfile"
printf 'RESTIC_REPOSITORY=/repo\nRESTIC_PASSWORD=dev-only\nBACKUP_API_TOKEN=%s\n' "$token" >"$envfile"
MOUNTS=(-v "$PWD:/volumes/db" -v "$PWD/public/media:/volumes/media" -v "$PWD/.backup-dev/repo:/repo")

docker run --rm --env-file "$envfile" "${MOUNTS[@]}" "$IMG" backup | grep -E 'backup finished|FAILED' || true
docker run -d --name "$NAME" -p 127.0.0.1:8081:8081 --env-file "$envfile" "${MOUNTS[@]}" "$IMG" schedule >/dev/null
echo "backup service running: API on http://127.0.0.1:8081, backups in .backup-dev/ (stop: pnpm backup:dev stop)"
