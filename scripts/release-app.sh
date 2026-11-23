#!/usr/bin/env bash
#
# release-app.sh — build and publish the Payload + Next.js app image.
#
#   build the app image (main Dockerfile)  →  push it to the registry
#
# This is the *dynamic* deployment: a running Payload app with SQLite + media on
# volumes and a live /admin. (For the read-only static snapshot instead, use
# `pnpm release:static`.)
#
# Usage:
#   pnpm release:app
#
# Overridable:
#   APP_IMAGE   target repository   (default ghcr.io/agiledivider/msb-homepage)
#   TAG         moving tag          (default latest)
#   PLATFORM    target architecture (default linux/amd64)
#
# Registry auth: reads GHCR_USER + GHCR_TOKEN from the environment or .env and
# runs `docker login` for you (the token is never printed). Falls back to an
# existing `docker login` if they're not set.
#
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${APP_IMAGE:-ghcr.io/agiledivider/msb-homepage}"
TAG="${TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"

die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
step() { printf '\n\033[36m[release]\033[0m %s\n' "$1"; }

# --- tags --------------------------------------------------------------------
# An immutable sha tag alongside the moving one, so a bad release can be rolled
# back to a known image. Uncommitted changes make the sha a lie — say so.
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null || SHA="${SHA}-dirty"

step "Publishing $IMAGE:$TAG ($SHA) for $PLATFORM"

# --- migrations on a copy of real data, before anything is pushed -----------
# The container runs `payload migrate` + the prod seed on start; a migration
# that fails there leaves prod in a restart loop (2026-11-22). So run both on a
# copy of a real backup first. Source: MIGRATE_CHECK_DB, else the newest
# ~/Downloads/msb-backup-*.tar.gz.enc (scripts/migrate-check.sh).
if [ "${SKIP_MIGRATE_CHECK:-}" = "1" ]; then
  printf '\033[33mwarning:\033[0m SKIP_MIGRATE_CHECK=1 — migrations not tried on real data\n'
else
  step "Checking migrations on a copy of real data"
  scripts/migrate-check.sh || die "migration check failed. Fix it, or with a reason: SKIP_MIGRATE_CHECK=1 pnpm release:app"
fi

# --- registry auth -----------------------------------------------------------
# The push needs a credential for the registry host. If GHCR_USER + GHCR_TOKEN
# are available (already exported, or in .env — same vars the publisher stack
# uses), log in with them so you don't need a prior `docker login`. The token is
# only ever fed to `docker login` on stdin; it is never printed or passed as an
# argument. If they're absent we fall through and rely on an existing login.
REGISTRY="${IMAGE%%/*}"
env_val() { sed -n "s/^$1=//p" .env 2>/dev/null | tail -1 | sed -e 's/^["'\'']//' -e 's/["'\'']$//'; }
GHCR_USER="${GHCR_USER:-$(env_val GHCR_USER)}"
GHCR_TOKEN="${GHCR_TOKEN:-$(env_val GHCR_TOKEN)}"
if [ -n "$GHCR_TOKEN" ]; then
  [ -n "$GHCR_USER" ] || die "GHCR_TOKEN is set but GHCR_USER is missing (check .env)."
  step "Logging in to $REGISTRY as $GHCR_USER"
  printf '%s' "$GHCR_TOKEN" | docker login "$REGISTRY" -u "$GHCR_USER" --password-stdin >/dev/null \
    || die "docker login $REGISTRY failed — check GHCR_USER / GHCR_TOKEN in .env."
fi

# --- build for the server's arch and push ------------------------------------
# buildx (not plain `docker build`): this host is $(uname -m), and an image built
# natively here won't start on an amd64 server. --push in the same step because
# a cross-platform image can't be loaded into the local daemon anyway.
#
# NEXT_PUBLIC_SERVER_URL is NOT needed here: unlike the static build it is not
# inlined into this image — the app reads it from the runtime environment
# (docker-compose.prod.yml). One image serves any origin.
step "Building + pushing the image"
docker buildx build \
  --platform "$PLATFORM" \
  --target runner \
  --tag "$IMAGE:$TAG" \
  --tag "$IMAGE:$SHA" \
  --push \
  . || die "buildx failed. Common causes:
         denied / unauthorized      → set GHCR_USER + GHCR_TOKEN in .env, or run 'docker login ghcr.io'
         proxyconnect … i/o timeout → Docker Desktop's internal proxy stalled; just re-run,
                                      or restart Docker Desktop if it persists"

step "Done — $IMAGE:$TAG and $IMAGE:$SHA are live"
echo "  deploy:  set IMAGE=$IMAGE:$TAG in the server's .env, then"
echo "           docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d"
