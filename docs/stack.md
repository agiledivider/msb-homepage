# Stack: "for X, use Y"

Add a row **in the same commit** that adds the dependency. When something is replaced, update its row (don't leave both).
Last reviewed: 2026-11-12 (versions from `package.json`)

| For… | Use | Not | Why | Since |
|---|---|---|---|---|
| package manager | pnpm 11 | bun, npm, yarn | Next + Payload tooling expects it (playbook exception); build-script approvals in `pnpm-workspace.yaml` | 2026-07 |
| runtime | Node 22 LTS (`node:22-slim` images) | Node 26 | Next 16 targets 20/22 LTS | 2026-07 |
| app framework | Next.js 16 (App Router), React 19.2 | TanStack Start (house default) | Payload 3 runs inside Next | 2026-07 |
| CMS | Payload 3.93 (`@payloadcms/next`, `ui`, `richtext-lexical`, `live-preview-react`) | — | code-first config, runs in the Next app; 3.85 → 3.93 on 2026-11-20 for security advisories | 2026-11 |
| database | SQLite via `@payloadcms/db-sqlite` (dev `push`, prod migrations) | Postgres | one file on a volume; enough for a Verein site | 2026-07 |
| roles / permissions | `payload-rbac-plugin` 1.1 + own `src/plugins/editorial` (review workflow) | hand-rolled role fields | RBAC CRUD gating; editorial roles were unified onto RBAC 2026-07-24 | 2026-07 |
| login (SSO) | `payload-oauth2` 1.0 against Kanidm (`src/plugins/oidc`) | — | Kanidm is the Verein IdP (setup in `DEPLOY.md`) | 2026-07 |
| images | `sharp` 0.35 (Payload sizes + static WebP ladder) | `unoptimized: true` | `srcset` survives static publishing (`docs/runtime-traps.md`) | 2026-07 |
| styling | Tailwind v4 (CSS-first `@theme`, `@tailwindcss/postcss`) | `tailwind.config.ts`, component CSS in globals | tokens in one place, utilities in components | 2026-07 |
| icons | Font Awesome 7 SVG React components | emoji, inline SVG, FA webfont | tree-shakeable, SSR-safe, no font requests | 2026-07 |
| fonts | `next/font/google` (Archivo Black, IBM Plex Sans) | CSS `@import` | Turbopack strips remote `@import` | 2026-07 |
| lint + format | Biome 2.5 | eslint, prettier | one fast tool | 2026-07 |
| tests | vitest 5 (integration on a temp SQLite per file, fitness tests) | jest | Payload boots in-process | 2026-11 |
| script runner | `tsx` | ts-node | runs `scripts/*.ts` | 2026-07 |
| static hosting | nginx 1.27 image or FTP webspace (`.htaccess`) | Node on the public host | public site needs no server; see `docs/STATIC.md` | 2026-07 |
| backups | restic 0.18 sidecar (`Dockerfile.backup`): SQLite online `.backup` + media, nightly | host-level volume snapshots, cron in the app image | encrypted, deduplicated, any off-site backend; retention + `check` built in | 2026-11 |
| CI / registry | GitHub Actions → GHCR | Docker Hub | playbook D3 | 2026-07 |

## Deliberately not used
- `output: 'standalone'` — flaky with Payload's admin/api routes (`docs/runtime-traps.md`).
- `next export` — the app also hosts `/admin` and `/api` and frontend routes are dynamic; the static site is a crawl (`docs/DECISIONS.md`).
