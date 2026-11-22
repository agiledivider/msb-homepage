# Runtime traps

A checklist in the form **When you do X → check Y → why**. Every entry names its source and the library or tool version it applies to. Mark superseded entries with ~~strikethrough~~ and a pointer to the replacement; don't delete them.
Cross-project traps also go into the playbook: `ai-development-skill/docs/lessons-learned.md`.

Collected 2026-11-12 from `LEARNINGS.md` and the session notes kept since July 2026; dates are when the trap was found.

## Payload / data

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| read blog / events / pages in `src/app/(frontend)` (incl. `generateMetadata`) | go through `findPublic()` / `findForRequest()` (`src/lib/publicData.ts`) | `payload.find` defaults to `overrideAccess: true`; draft titles leaked into `<head>`, page bodies and `calendar.ics`. Enforced by `tests/fitness/frontend-reads.test.ts` (`521eea1`) | Payload 3.85 · 2026-11-12 |
| seed or script-write a `_status: 'published'` doc | pass `{ context: { [EDITORIAL_SKIP]: true } }` and `reviewStatus: 'approved'` | the editorial `publishGate` forces non-reviewer writes (seeds have no `req.user`) to draft + `in_review`; the seed logs success but nothing shows. Check with `sqlite3 msb.db "SELECT slug,_status FROM blog"` | Payload 3.x · 2026-07 |
| write a script for `pnpm payload run` / `pnpm seed` | the module uses **top-level** `await run()` then `process.exit` | `payload run` only awaits module evaluation; `run().then()` exits 0 before any work (no logs, no writes; looks like a hang). Burned twice. Pattern: `src/seed/index.ts` | Payload 3.x · 2026-07 |
| add an endpoint that takes a large request body (uploads) | keep its path out of the `src/proxy.ts` matcher (all of `/api/` is excluded) | with a proxy in front, Next buffers the body for both reads and cuts it off at 10 MB (`experimental.proxyClientMaxBodySize`), only logging a warning; the route gets a truncated file. Found before shipping the backup upload (S8.4) | Next 16.4 · 2026-11-22 |
| seed a media file and look it up by `filename` to stay idempotent | pass `overwriteExistingFiles: true` to `payload.create` | a file of that name already on disk (leftover from a recreated DB) makes Payload rename the upload (`legacy-374.jpg` → `legacy-375.jpg`, `satzung.pdf` → `satzung-4.pdf`), so the lookup never matches and every run adds a copy. Found during the archive import (2026-11-22); fixed in `src/seed/legacy.ts` and `content.ts` | Payload 3.93.0 · 2026-11-22 |
| run a seed / `payload run` against `msb.db` | `pnpm dev:stop` first | `next dev` holds the SQLite file lock | — · 2026-07 |
| re-run `pnpm seed` on an existing DB | use the idempotent runners (`src/seed/run-legal.ts`, `run-legacy.ts`) instead | the main seed uses plain `payload.create` and duplicates content | — · 2026-07 |
| see dev push abort with `SQLITE_ERROR: index … already exists` | recreate the dev DB: `pnpm dev:stop; rm -f msb.db msb.db-wal msb.db-shm; pnpm seed; pnpm payload run src/seed/rbac.ts` (`pnpm seed` includes the migrated blog posts and events since 2026-11-22; the 200 demo events are gone) | the local DB drifted (manual SQL, renames); dev data is reproducible from seeds | Payload db-sqlite 3.x · 2026-07 |
| change a collection or field | `pnpm generate:types` and `pnpm payload migrate:create <name>`; commit the migration | `push` only runs in development; the prod image runs `payload migrate` on start (`src/migrations/`) | Payload 3.x · 2026-07 |
| generate a migration that adds a new collection plus relationships to it | run up, down and up again on a seeded DB built from the previous migrations, and compare row counts | the generated SQLite `down` dropped `payload_folders` first and turned foreign keys back on mid-way, so rebuilding `events` failed and left a stray `__new_events` table. Fixed by hand in `20261121_232740_folders.ts` and again in `20261122_012602_claude_mcp.ts` (same pattern every time) | Payload db-sqlite 3.93 · 2026-11-22 |
| add a field to a versioned collection while dev `push` is on | expect push to fail with `no such column: version_<field>` and leave `__new_*` tables; use the recreate-dev-DB recipe above (plus `run-legacy.ts`, `run-legal.ts`) | drizzle's push rebuilds the table and copies the new column from the old one. Orphaned `payload_preferences_rels` rows also break push rebuilds on a FK | Payload db-sqlite 3.93 · 2026-11-22 |
| add a plugin collection with a required relation to `users` | test deleting a user who has such a document | `@payloadcms/plugin-mcp` declares `user_id NOT NULL … ON DELETE set null`, so deleting the user fails in SQLite; `src/plugins/mcp` deletes keys in a `beforeDelete` hook | plugin-mcp 3.93 · 2026-11-22 |
| block address ranges with `node:net` `BlockList` | never add `::ffff:0:0/96` | BlockList treats IPv4 and IPv4-mapped IPv6 as equal, so that rule blocks every IPv4 address; check mapped addresses as IPv4 yourself (`fetchPublicFile.ts`, caught by `tests/unit/media-upload.test.ts`) | Node 26 · 2026-11-22 |
| rely on Payload's default access (no `access` set) | that "logged in" means a real CMS user | the default is "any authenticated principal"; auth collections like MCP API keys would count. `requireCmsUserByDefault` fills unset rules with `loggedIn` (`users` only) | Payload 3.93 · 2026-11-22 |
| add a field editors change without editing content (e.g. `folder`) | that the editorial `publishGate` lets it through for published docs | the gate sees the merged doc as `_status: 'published'` and would unpublish a live page an editor merely filed into a folder. `onlyFiled()` in `publishGate.ts` exempts filing-only updates; `tests/integration/folders.test.ts` | Payload 3.93 · 2026-11-22 |

## Build / deploy

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| add a dependency with an install/build script | add it to `allowBuilds` in `pnpm-workspace.yaml` | pnpm 11 ignores `package.json` `pnpm` approvals; a fresh install aborts with `ERR_PNPM_IGNORED_BUILDS`. Docker also passes `--config.dangerouslyAllowAllBuilds=true` and the deps stage needs `python3 make g++` for node-gyp (bufferutil, utf-8-validate) | pnpm 11 · 2026-07 |
| build the runtime image | `tsconfig.json` is copied into it | the Payload CLI (`migrate`) finds the config through `tsconfig.json` | Payload 3.x · 2026-07 |
| consider `output: 'standalone'` | don't; the image runs plain `next start` | standalone was flaky with Payload's admin/api routes and the Node proxy | Next 16 · 2026-07 |
| add request gating (auth, redirects needing env) | put it in `src/proxy.ts`, not `middleware.ts` | Edge middleware can't read runtime env and silently no-ops | Next 16 · 2026-07 |
| test a container locally | pick a clearly free host port | `localhost:3001` (and often `:3000`) is held by other local projects | — · 2026-07 |
| change `deviceSizes` / `imageSizes` | they must come from `src/lib/imageWidths.mjs` | the static publisher only generates those widths; any other width is a silent 404 inside `srcset` | Next 16 · 2026-07 |
| set `images.loader` | never also set `unoptimized: true` | Next then ignores the loader and ships full-size originals (58 MB of source imagery) | Next 16 · 2026-07 |
| replace an image in `public/` | write it under a **new filename** | Next caches optimised `<Image>` output by URL (and browsers cache too), so a same-named overwrite keeps serving the stale version | Next 16 · 2026-07 |

## Local machine

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| see wrong-arch native modules (x86 `sharp`), HMR dead with `TypeError: t.unmask is not a function`, or "inferred workspace root" warnings | `~/node_modules` / `~/package.json` / `~/package-lock.json` leaking in; install the offender locally (`bufferutil`, `utf-8-validate` already are) | Node walks every ancestor `node_modules`; there is no flag to stop it. Root is pinned via `turbopack.root` in `next.config.mjs`. Don't delete the home toolbox | Node 22–26 · 2026-07 |
| run on Homebrew Node 26 | prefer `node@22` (`/opt/homebrew/opt/node@22/bin`) | Next 16 targets Node 20/22 LTS; 26 works here but is unsupported | Next 16 · 2026-07 |
| test the dev server on a phone over the LAN | add the LAN IP / subnet to `allowedDevOrigins` in `next.config.mjs` and restart dev | Next blocks cross-origin `/_next/*` (HMR socket **and** JS chunks); the page renders but never hydrates. Works in the iOS Simulator (localhost), dead on the device | Next 16 · 2026-07 |
| change a token in `src/styles/globals.css` (`@theme`) while `pnpm dev:start` is running | the served CSS actually has the new value (`curl` the page's `/_next/static/…css` and grep the variable); if not, `scripts/dev-server.sh restart` | the running dev server kept serving the old `--color-*` values after two `@theme` edits, while component edits hot-reloaded fine; contrast checks then measured stale colours. Seen in the styleguide 2026-11 contrast fix | Next 16.4.6 · Tailwind 4.3 · 2026-11-22 |
| ship a fixed image the code expects (fallback, decoration) | it lives in a committed folder like `public/brand/`, never `public/media/` | `public/media` is the Payload upload dir: gitignored, in `.dockerignore`, a volume in production. The fallback map on /mitmachen worked locally for months and was a 404 on the server. Enforced by `tests/fitness/no-upload-dir-assets.test.ts`; static publish needs the folder in `MEDIA_SOURCES` for its WebP ladder | Payload 3.x · Next 16 · 2026-11-22 |

## Hero prism / CSS

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| touch the prism's 3D transforms | tilt and spin live on **one** `preserve-3d` element | nesting two `preserve-3d` levels breaks `backface-visibility` culling; rear faces show mirrored | Chrome / Safari · 2026-07 |
| position the prism element | `.msb-flip` is `position: relative; width/height: 100%` inside a fixed-height scene, not `position: absolute; inset: 0` | the absolutely positioned prism flattened in WKWebView (`LEARNINGS.md` §3) | WKWebView · 2026-07 |
| add `will-change: transform` to the prism | don't | breaks backface culling in WebKit | Safari · 2026-07 |
| animate the prism transform | write the transform as a literal value, not `rotateY(var(--spin))` | WebKit doesn't interpolate a `transition: transform` changed through a custom property | Safari · 2026-07 |
| set `overflow` (incl. `html,body{overflow-x:hidden}`) on any ancestor of the prism | keep it `visible`; inset the scene instead | non-visible overflow flattens the prism in WebKit (broke it on iPhone) and clips it in Blink | iOS Safari · 2026-07 |
| use Tailwind `rotate-y-*` / `translate-z-*` on prism faces | use the arbitrary `transform-[rotateY()_translateZ()]` form | v4's individual utilities reorder the transform functions | Tailwind 4 · 2026-07 |
| verify the prism (or measure anything inside it) in a WebKit pane | verify in Blink (headless Chrome over CDP, `Emulation.setDeviceMetricsOverride`) and iOS on a real iPhone; measure with `getComputedStyle`, not rects | WKWebView flattens the prism and skews `getBoundingClientRect`. `--window-size` + `--screenshot` renders at the wrong width | WKWebView · 2026-07 |
| check several viewport widths quickly | load the page in a same-origin `<iframe width=375 height=667>` | media queries and `svh` evaluate against the iframe box | — · 2026-07 |
| build a class name from a runtime value | set a CSS var inline and reference it with a literal class (`lg:rotate-[var(--pl-rot)]`) | the JIT can't see concatenated class names | Tailwind 4 · 2026-07 |
| size a nested element with `100vw` math | use `w-full` | `100vw - Npx` forgot ancestor padding; the Polaroid overflowed the mat | — · 2026-07 |
| cap width with `max-w-*` | put it on a block child, not on a flex/grid item | the cap silently didn't apply on the flex item on short/landscape screens | — · 2026-07 |
| absolutely position a caption in a frame's bottom padding | `inset-x-0 bottom-0 flex h-6 items-center leading-none` with `h-*` == the frame's `pb-*` | `bottom-3` + line box made text ride over the photo | — · 2026-07 |
| load web fonts | `next/font/google` in `(frontend)/layout.tsx`, mapped in `@theme` | Turbopack strips remote CSS `@import` | Next 16 · 2026-07 |

## Prototype only (`MakerSpace Bonn Redesign.dc.html`)

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| target inline styles with `[style*="…"]` in the DC prototype | match on value tokens (`340px`, `repeat(3`) | the DC runtime renders styles through React and re-serialises them (`a:b` → `a: b`, `repeat(3,1fr)` → `repeat(3, 1fr)`). See `LEARNINGS.md` §1 | support.js · 2026-07-03 |
| look for the `<img>` inside `<image-slot>` | query the shadow root | the image lives in shadow DOM; light-DOM `#id img` returns nothing | image-slot.js · 2026-07-03 |
| ~~use a single-face flip on mobile because WebKit flattens the prism~~ | superseded: the production hero uses the true prism at all widths; the iPhone flattening was caused by `overflow-x:hidden` (see the overflow row above) | `LEARNINGS.md` §3–4 | 2026-07 |
