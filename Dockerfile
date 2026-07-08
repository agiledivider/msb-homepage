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

# ---- build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# placeholders so config init during `next build` doesn't complain; no DB is touched
ENV PAYLOAD_SECRET=build-placeholder DATABASE_URI=file:/tmp/build.db
RUN pnpm run build

# ---- runtime ----
# Regular `next start` (not standalone) — most reliable for Payload's admin/api
# routes and the Node-runtime proxy (Basic Auth).
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs \
  /app/package.json /app/next.config.mjs /app/tsconfig.json ./

# Volume mount points (named volumes inherit this ownership on first run).
RUN mkdir -p /app/data /app/public/media && chown -R nextjs:nodejs /app/data /app/public/media

USER nextjs
EXPOSE 3000
# apply DB migrations (creates the schema on a fresh volume; no-op once applied),
# then start. Payload `push` is dev-only, so prod relies on migrations. Use the
# binaries directly to avoid a corepack/pnpm download at runtime.
CMD ["sh", "-c", "node_modules/.bin/payload migrate && node_modules/.bin/next start"]
