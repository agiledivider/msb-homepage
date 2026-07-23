# Deployment (Docker + SQLite)

Self-contained image running Payload + Next.js with a SQLite DB and uploaded
media on **persistent volumes**.

> This deployment is **not password-gated**. Anything reachable at its URL is
> public, including `/admin` (which still requires a Payload login). To publish
> only the public site as static files instead, see [docs/STATIC.md](docs/STATIC.md).

## Build & push

```bash
pnpm release:app
```

Builds the app image and pushes it, tagged both `:latest` and `:<git-sha>` (so a
bad release can be rolled back to a known image). Defaults:

| var        | default                              | note                          |
| ---------- | ------------------------------------ | ----------------------------- |
| `APP_IMAGE`| `ghcr.io/agiledivider/msb-homepage`  | target repository             |
| `TAG`      | `latest`                             | moving tag                    |
| `PLATFORM` | `linux/amd64`                        | server arch (cross-built)     |
| `TARGET`   | `runner`                             | `demo` bakes in `demo-seed/`  |

```bash
APP_IMAGE=ghcr.io/you/msb-homepage TAG=v1.2.0 pnpm release:app
```

Push first requires `docker login ghcr.io`. The build is cross-platform via
buildx, so it runs on Apple Silicon and produces an `amd64` image. Unlike the
static build, `NEXT_PUBLIC_SERVER_URL` is **not** baked in — the app reads it
from the runtime env, so one image serves any origin.

Manual equivalent, if you prefer:

```bash
docker buildx build --platform linux/amd64 -t <registry>/msb-homepage:TAG --push .
```

## Run on a server

1. Copy `docker-compose.prod.yml` and create a `.env` next to it
   (see `.env.production.example`):

   ```env
   IMAGE=<registry>/msb-homepage:TAG
   PAYLOAD_SECRET=<openssl rand -hex 32>
   NEXT_PUBLIC_SERVER_URL=https://your-domain
   ```

2. Start it:

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

On boot the container **runs DB migrations** (schema), then a **seed**, then
starts. The seed is idempotent and does three things:

1. RBAC permissions + `Administrator`/`Redakteur` roles (every start).
2. An init admin, if `INIT_ADMIN_*` is set and that user is missing (see below).
3. **On a fresh DB only** (no pages/blog/events yet), the **launch content**:
   the menu/footer + hero globals, the structural pages (Verein, Werkzeug,
   Mitmachen), the legal pages (Impressum, Datenschutz, Haftung + Satzung PDF),
   and the real blog posts + events (the migrated "Aktuelles" articles, with
   301-redirect ids, plus a few hand-authored samples). Once any content exists
   this step is skipped, so it never overwrites edits made through `/admin`.

So a first deploy comes up **fully populated and browsable** — no empty-DB 500s,
nothing to import by hand. The content lives in `src/seed/` (and its images in
`uploads/`, bundled into the image); edit there and rebuild to change the
launch set. The 200 synthetic demo events (`src/seed/events.ts`) are **not**
part of the production seed.

**Set `INIT_ADMIN_EMAIL` + `INIT_ADMIN_PASSWORD` for the first deploy.** On a fresh
DB that creates a ready admin (admin role + full permissions) so you can log
straight into `/admin`. Without it, a user created via the `/admin` first-user
screen starts as a plain editor with no permissions — and since there's no
existing admin to grant them a role yet, you'd be locked out. Once you have one
admin, you can drop the `INIT_ADMIN_*` vars.

## What persists

- **`db` volume** → `/app/data/msb.db` (SQLite). Keep it to keep your content.
- **`media` volume** → `/app/public/media` (uploaded images).

## Schema changes

The app uses SQLite `push` in **dev only**. In prod it applies **migrations**.
After changing collections/fields, generate a new migration and commit it:

```bash
pnpm payload migrate:create <name>
```

It'll be applied automatically on the next container start.
