#!/usr/bin/env bash
#
# release-static.sh — publish the static site as a container image.
#
#   snapshot the site  →  build the nginx image  →  push it to the registry
#
# Usage:
#   NEXT_PUBLIC_SERVER_URL=https://makerspacebonn.de pnpm release:static
#
# Overridable:
#   STATIC_IMAGE   target repository   (default ghcr.io/agiledivider/msb-static)
#   TAG            moving tag          (default latest)
#   PLATFORM       target architecture (default linux/amd64)
#   SKIP_PUBLISH=1 reuse the existing dist/ instead of re-crawling
#
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${STATIC_IMAGE:-ghcr.io/agiledivider/msb-static}"
TAG="${TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"

die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
step() { printf '\n\033[36m[release]\033[0m %s\n' "$1"; }

# --- guard: the public origin is compiled into the bundle --------------------
# NEXT_PUBLIC_* is inlined at build time and ends up in metadataBase, sitemap.xml,
# robots.txt and the iCal feed. `.env` holds the dev value, and a process env var
# beats it — so it must be passed explicitly rather than inherited by accident.
: "${NEXT_PUBLIC_SERVER_URL:=}"
[ -n "$NEXT_PUBLIC_SERVER_URL" ] || die \
  "NEXT_PUBLIC_SERVER_URL is not set. It is baked into the bundle (sitemap, og:image, iCal).
       Run e.g.  NEXT_PUBLIC_SERVER_URL=https://makerspacebonn.de pnpm release:static"
case "$NEXT_PUBLIC_SERVER_URL" in
  *localhost*|*127.0.0.1*) die "NEXT_PUBLIC_SERVER_URL is '$NEXT_PUBLIC_SERVER_URL' — that would publish localhost URLs." ;;
esac
export NEXT_PUBLIC_SERVER_URL

# --- tags --------------------------------------------------------------------
# An immutable sha tag alongside the moving one, so a bad release can be rolled
# back to a known image. Uncommitted changes make the sha a lie — say so.
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null || SHA="${SHA}-dirty"

step "Publishing $IMAGE:$TAG ($SHA) for $PLATFORM"
echo "  origin: $NEXT_PUBLIC_SERVER_URL"

# --- 1. snapshot -------------------------------------------------------------
if [ "${SKIP_PUBLISH:-}" = "1" ]; then
  [ -d dist ] || die "SKIP_PUBLISH=1 but dist/ does not exist."
  step "Reusing existing dist/ (SKIP_PUBLISH=1)"
else
  step "Snapshotting the site → dist/"
  pnpm publish:static
fi

[ -f nginx.conf ] || die "nginx.conf missing — the publish step should have generated it."

# --- 2 + 3. build for the server's arch and push -----------------------------
# buildx (not plain `docker build`): this host is $(uname -m), and an image built
# natively here won't start on an amd64 server. --push in the same step because
# a cross-platform image can't be loaded into the local daemon anyway.
step "Building + pushing the image"
docker buildx build \
  --platform "$PLATFORM" \
  -f Dockerfile.static \
  --tag "$IMAGE:$TAG" \
  --tag "$IMAGE:$SHA" \
  --push \
  . || die "buildx failed. Not logged in? → docker login ghcr.io"

step "Done — $IMAGE:$TAG and $IMAGE:$SHA are live"
echo "  deploy:  docker compose -f docker-compose.static.yml pull && docker compose -f docker-compose.static.yml up -d"
