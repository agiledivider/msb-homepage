#!/usr/bin/env bash
# dev-service.sh — run the real backup service next to `pnpm dev`, so the admin
# backups view (/admin/backups, E8) has something to show. Needs Docker.
#
#   pnpm backup:dev           build the image, take one backup now, start the
#                             service with its API on 127.0.0.1:8081
#   pnpm backup:dev stop      stop it (the backups in .backup-dev/ stay)
#
# Backs up the dev msb.db and public/media. Where to: RESTIC_REPOSITORY and
# RESTIC_PASSWORD from .env when both are set (e.g. a Storage Box sub-account
# of its own, `sftp:storagebox:msb-homepage-dev`; SSH key, known_hosts and
# config in BACKUP_SSH_DIR, default ./backup-ssh, as on the server: DEPLOY.md
# "Backups"). Otherwise a local restic repository in .backup-dev/ (gitignored)
# with a throwaway password. Never point this at the staging or production
# repository: a dev restore would happily read it.
# Reads BACKUP_API_TOKEN from .env by name; the dev server needs
# BACKUP_API_URL=http://127.0.0.1:8081 and the same token there.
set -euo pipefail
cd "$(dirname "$0")/../.."

NAME=msb-backup-dev
IMG=msb-backup:dev

if [[ ${1-} == stop ]]; then
  docker rm -f "$NAME" >/dev/null 2>&1 && echo "backup service stopped" || echo "backup service was not running"
  exit 0
fi

env_value() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- || true; }
token=$(env_value BACKUP_API_TOKEN)
[[ -n $token ]] || { echo "BACKUP_API_TOKEN is not set in .env (see .env.local.example)" >&2; exit 1; }
[[ -f msb.db ]] || { echo "no msb.db here; start the dev server or seed first" >&2; exit 1; }

repo=$(env_value RESTIC_REPOSITORY)
password=$(env_value RESTIC_PASSWORD)
mkdir -p public/media
docker build -q -f Dockerfile.backup -t "$IMG" . >/dev/null
docker rm -f "$NAME" >/dev/null 2>&1 || true

# Secrets go in through an env file, not argv, so they don't show in `ps`.
envfile=$(mktemp)
trap 'rm -f "$envfile"' EXIT
chmod 600 "$envfile"
MOUNTS=(-v "$PWD:/volumes/db" -v "$PWD/public/media:/volumes/media")
RUN=("$IMG")
if [[ -n $repo && -n $password ]]; then
  where=$repo
  printf 'RESTIC_REPOSITORY=%s\nRESTIC_PASSWORD=%s\n' "$repo" "$password" >"$envfile"
  if [[ $repo == sftp:* ]]; then
    ssh_dir=$(env_value BACKUP_SSH_DIR)
    ssh_dir=${ssh_dir:-backup-ssh}
    [[ -f $ssh_dir/config && -f $ssh_dir/known_hosts ]] ||
      { echo "$repo needs $ssh_dir/{config,known_hosts,id_ed25519} (DEPLOY.md \"Backups\")" >&2; exit 1; }
    # ssh refuses keys it doesn't own; a bind mount from macOS has the wrong
    # owner, so the container copies the folder to its own ~/.ssh first.
    MOUNTS+=(-v "$(cd "$ssh_dir" && pwd):/ssh-src:ro")
    RUN=(--entrypoint sh "$IMG" -c 'cp -R /ssh-src "$HOME/.ssh" && chmod -R go-rwx "$HOME/.ssh" && exec msb-backup "$@"' sh)
  fi
else
  where=.backup-dev/
  mkdir -p .backup-dev/repo
  printf 'RESTIC_REPOSITORY=/repo\nRESTIC_PASSWORD=dev-only\n' >"$envfile"
  MOUNTS+=(-v "$PWD/.backup-dev/repo:/repo")
fi
printf 'BACKUP_API_TOKEN=%s\n' "$token" >>"$envfile"

docker run --rm --env-file "$envfile" "${MOUNTS[@]}" "${RUN[@]}" backup | grep -E 'backup finished|FAILED|repository|Fatal' || true
docker run -d --name "$NAME" -p 127.0.0.1:8081:8081 --env-file "$envfile" "${MOUNTS[@]}" "${RUN[@]}" schedule >/dev/null
echo "backup service running: API on http://127.0.0.1:8081, backups in $where (stop: pnpm backup:dev stop)"
