# MakerSpace Bonn — Payload CMS 3 + Next.js

Running instance of the MakerSpace Bonn homepage. The site is Next.js (App Router);
content is managed in Payload (SQLite). The homepage hero is **data-driven**: its
three prism faces come from three live sources.

## Quick start

```bash
pnpm install
pnpm dev            # → http://localhost:3000  (site)
                    # → http://localhost:3000/admin  (Payload admin)
```

First run creates `msb.db` (SQLite) automatically via Payload's dev schema push.

### Seed demo content

```bash
pnpm seed
```

Creates an admin user, uploads the hero photos, and fills HeroSettings/SiteSettings,
2 blog posts, 6 events (dated relative to today), and the Verein/Werkzeug/Mitmachen
pages.

- **Admin login:** `admin@makerspacebonn.de` — password is in `.env` as
  `PAYLOAD_SEED_PASSWORD` (generated on setup).
- `pnpm seed` is re-runnable: it wipes the blog/events/pages/media collections and
  recreates them (the admin user is kept).

## How the data-driven hero works

`src/app/(frontend)/page.tsx` (a server component) composes exactly **three** hero
faces and passes them to the presentational `HeroComponent`:

| Face | Source | Query |
|------|--------|-------|
| 0 · Werkstatt | `HeroSettings` global | `findGlobal('heroSettings')` |
| 1 · Blog | latest published post | `blog` sort `-publishedAt` limit 1 |
| 2 · Event | next upcoming event | `events` where `date >= now` sort `date` limit 1 (fallback: most recent past) |

Mapping lives in `src/lib/mappers.ts`. The carousel **requires exactly 3 faces**, so
if there's no post or no event, a static fallback face fills the slot. The Start
"Was läuft" feed and the `/events` list are likewise fed from the Events collection.

## Structure

```
src/
  app/
    (payload)/         # Payload admin route group (generated boilerplate)
    (frontend)/        # public site: layout, page (start), [slug], blog, events
  blocks/              # content blocks (config.ts + Component.tsx) → src/README.md
  collections/         # Users, Media, Blog, Events, Pages
  globals/             # HeroSettings, SiteSettings
  components/          # Header, Footer, TopStrip, RenderBlocks, Media, ui
  lib/                 # getPayload, mappers
  seed/                # pnpm seed
  payload.config.ts
```

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm seed` — populate demo content
- `pnpm generate:types` — regenerate `src/payload-types.ts` after schema changes
- `pnpm generate:importmap` — regenerate the admin import map after adding custom admin components
- `pnpm publish:static` — snapshot the public site into `dist/` (see [docs/STATIC.md](docs/STATIC.md))
- `pnpm release:static` — snapshot + build + push the static nginx image to ghcr
- `pnpm publisher` — run the publish worker locally (normally a container, see [docs/PUBLISHING.md](docs/PUBLISHING.md))

## Notes

- **Database:** SQLite via `@payloadcms/db-sqlite` with dev `push: true` (auto schema
  sync). For production, switch to migrations (`payload migrate:create`, `push: false`)
  and consider Postgres.
- **Hosting:** the CMS is a serverful Next app (needs Node) — Vercel / Railway / a
  Node VPS, or the Docker image in [DEPLOY.md](DEPLOY.md). The *public site* can also
  be published as plain static files and served from nginx or classic FTP webspace:
  `pnpm publish:static`, see [docs/STATIC.md](docs/STATIC.md).
- **Hero 3D:** the prism uses `preserve-3d`; it animates in Blink (Chrome/Edge) and
  degrades to a single static face in WebKit — same as the original design.
- If Next warns about an inferred workspace root, it's the stray `~/package-lock.json`
  in your home dir; `next.config.mjs` pins the root to this project.
