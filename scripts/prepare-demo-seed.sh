#!/usr/bin/env bash
#
# prepare-demo-seed.sh — snapshot the current content DB + uploaded media into
# demo-seed/, which the Docker `demo` stage bakes into the image so a fresh
# deploy comes up pre-populated (Docker copies it into the empty volumes on the
# first start).
#
# Safe to run while the dev server is up: the DB is copied with SQLite's online
# `.backup` (consistent snapshot, no lock fight).
#
# Usage: scripts/prepare-demo-seed.sh

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="demo-seed"
DB="${1:-msb.db}"

[ -f "$DB" ] || { echo "DB not found: $DB" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/media"

# consistent snapshot (works while the dev server holds the DB open).
# .sqlite (not .db) so .dockerignore's *.db rule doesn't exclude it from the build.
sqlite3 "$DB" ".backup '$OUT/demo.sqlite'"

# uploaded media (media-collection staticDir) + static assets served from /media
if [ -d public/media ]; then
  cp -R public/media/. "$OUT/media/"
fi

echo "demo-seed prepared:"
du -sh "$OUT/demo.sqlite" "$OUT/media"
