# MakerSpace Bonn homepage

Public website of MakerSpace Bonn e.V. with a CMS for the Verein's editors. Stack: pnpm 11 · Next.js 16 (App Router) · Payload CMS 3 (SQLite) · Tailwind 4 · Biome 2 · vitest. Not live yet; the public site can also be published as static files (nginx / FTP webspace).

Global rules (git, done-gate, secrets, verification, where knowledge goes) come from `~/.claude/CLAUDE.md`; only project-specific rules live here.

## Commands
```bash
pnpm install                 # one-time after clone (pnpm only, see Rules)
pnpm dev:start               # dev server on :3000, detached (dev:stop / dev:status / dev:logs)
pnpm seed                    # demo content into msb.db (stop the dev server first: SQLite lock)
pnpm test                    # vitest: integration (temp SQLite per file) + fitness tests
pnpm backlog:summary         # after any docs/BACKLOG.md edit (pnpm test fails on a stale summary)
pnpm generate:types          # after any collection/field change
pnpm payload migrate:create <name>   # after any schema change; prod runs migrations, not push
pnpm publish:static          # snapshot the public site into dist/ (docs/STATIC.md)
pnpm release:app | release:static    # build + push images (DEPLOY.md)
```

## Gate
- Fast check (after every change): `pnpm lint` (Biome; `pnpm lint:fix` applies safe fixes)
- Full gate (before "done" / commit): `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- Evidence: vitest summary line (`Tests N passed`), `tsc` exit 0, `next build` route table.
- Known baseline (2026-11-12): `pnpm lint` reports 20 pre-existing errors (mostly `noArrayIndexKey`, `noNonNullAssertion`), see `docs/BACKLOG.md`. Don't add new ones; typecheck, 29 tests and build are green.

## Rules
- **Next.js APIs:** read `AGENTS.md` first. Next 16.4 is newer than the model's training data, and the docs matching the installed version are in `node_modules/next/dist/docs/`. `next dev` regenerates the file, so commit it rather than deleting it.
- **pnpm only** (playbook exception: Next + Payload). Dependency build scripts must be listed in `pnpm-workspace.yaml` → `allowBuilds`.
- **Public reads go through `findPublic()` / `findForRequest()`** in `src/lib/publicData.ts` (published + approved, `overrideAccess: false`). A direct `payload.find` in `src/app/(frontend)` leaks drafts; `tests/fitness/frontend-reads.test.ts` enforces this.
- **Seeds that write published content** pass `{ context: { [EDITORIAL_SKIP]: true } }` and `reviewStatus: 'approved'`, or the editorial publish gate silently turns them into drafts.
- **Schema:** dev uses `push: true`; production runs `payload migrate` on container start. Every schema change ships with a migration in `src/migrations/`.
- **No auth gate in front of the app** (Basic Auth removed 2026-07-22). Any Payload deployment is public; see the 🚨 go-live blocker in `docs/BACKLOG.md`.
- **Styling:** Tailwind v4 utilities in the component, tokens only in `@theme` (`src/styles/globals.css`); mobile-first, hero/header switch at `md`; no `!important`. Icons: Font Awesome SVG React components.
- **Hero prism:** design choices (true 3D prism on all widths, tilt, anticipation + overshoot) are confirmed by Falk; don't change them without asking. Render traps in `docs/runtime-traps.md`.
- **Browser checks:** WebKit-based panes flatten the prism; verify the hero in Blink (headless Chrome over CDP) and iOS on a real iPhone.

## Architecture
```
src/app/(frontend)/   public site (start, [slug], blog, events, events/archiv, calendar.ics)
src/app/(payload)/    Payload admin (generated boilerplate)
src/blocks/           page-builder blocks: config.ts + Component.tsx each (src/README.md)
src/collections/ src/globals/ src/fields/ src/access/
src/plugins/          editorial (review workflow + publish gate), oidc (Kanidm), publish (static publish button)
src/lib/              publicData (public read boundary), mappers, legacyRedirects, staticImageLoader
src/seed/             pnpm seed + idempotent runners (run-legal.ts, run-legacy.ts)
src/proxy.ts          Next 16 proxy: legacy Joomla 301s only
scripts/              dev-server.sh, publish-static.ts, publisher-server.ts, release-*.sh
tests/                integration/ (boots Payload on a temp DB), fitness/ (grep-style rules)
```

## Docs (read before touching the area)
| Topic | File |
|---|---|
| Backlog, go-live blockers | `docs/BACKLOG.md` |
| Traps ("when X → check Y") | `docs/runtime-traps.md` |
| Library choices | `docs/stack.md` |
| Decisions | `docs/DECISIONS.md` |
| Docker deploy, OIDC | `DEPLOY.md` |
| Claude in the CMS (MCP) | `docs/CLAUDE-MCP.md` |
| Static publishing / publish worker | `docs/STATIC.md`, `docs/PUBLISHING.md` |
| Original `.dc.html` design prototype | `LEARNINGS.md` |
| Analytics / DSGVO research | `docs/analytics-dsgvo-research.md` |
