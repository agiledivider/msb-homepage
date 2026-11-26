# syntax=docker/dockerfile:1
# Multi-stage build for the Payload + Next.js app (SQLite). Produces a small
# standalone runtime image. Build: docker build -t msb-homepage:latest .

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

# ---- dependencies (with native build scripts: sharp, libsql, …) ----
FROM base AS deps
WORKDIR /app
# toolchain for node-gyp native addons (bufferutil, utf-8-validate)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm 11 blocks dependency build scripts (sharp, esbuild, …) and aborts; allow them
RUN pnpm install --frozen-lockfile --config.dangerouslyAllowAllBuilds=true

# ---- runtime dependencies only ----
# The runtime needs no linter, test runner or CSS toolchain (S6.8). Payload's CLI
# (migrate, run) brings its own tsx; typescript stays, plugin-mcp imports it.
# Next's SWC compiler only compiles (`next build`); `next start` never loads it,
# which is why Next's own standalone output leaves it out too.
FROM deps AS prod-deps
RUN pnpm prune --prod --config.dangerouslyAllowAllBuilds=true \
  && rm -rf node_modules/.pnpm/@next+swc-*

# ---- build ----
# Starts from deps rather than copying node_modules over: the copy took ~20 s
# per build and stored a second ~1 GB layer in the build cache (S6.10).
FROM deps AS builder
COPY . .
# placeholders so config init during `next build` doesn't complain; no DB is touched
ENV PAYLOAD_SECRET=build-placeholder DATABASE_URI=file:/tmp/build.db
# Generate Payload's types first: src/payload-types.ts is git-ignored, so it is
# absent on a clean checkout (e.g. CI) and the type-checked build would fail on
# `@/payload-types`. It is derived from the config, so regenerating is correct.
RUN pnpm run generate:types && pnpm run build \
  # build-time cache only; `next start` never reads it (S6.8)
  && rm -rf .next/cache

# ---- runtime ----
# Regular `next start` (not standalone) — most reliable for Payload's admin/api
# routes and the Node-runtime proxy (legacy redirects).
# Plain Node, no package manager: the CMD runs the binaries directly, and npm /
# corepack only add size and scan findings (S6.8).
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
     /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  && groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs \
  # Volume mount points (named volumes inherit this ownership on first run).
  && mkdir -p /app/data /app/public/media && chown -R nextjs:nodejs /app/data /app/public

# Layers run from rarely to often changed (S6.10): a code change rebuilds only
# the last two, so a deploy pulls a few MB of src plus .next, not the assets.
# Assets come straight from the build context, not via the builder: their cache
# key is then their own content, so a fresh CI checkout still hits the cache.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# uploads/ holds the seed's source images (hero photos, legacy article images,
# Satzung PDF). The first-boot prod seed reads them from here and writes the
# resulting media onto the `media` volume. Not served directly.
COPY --chown=nextjs:nodejs uploads ./uploads
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs package.json next.config.mjs tsconfig.json ./
# From the builder: it carries the generated src/payload-types.ts.
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs
EXPOSE 3000
# migrate (schema) → seed roles/permissions (+ optional init admin) → start.
# All idempotent. Payload `push` is dev-only, so prod relies on migrations.
# Binaries run directly to avoid a corepack/pnpm download at runtime.
CMD ["sh", "-c", "node_modules/.bin/payload migrate && node_modules/.bin/payload run src/seed/prod.ts && node_modules/.bin/next start"]
