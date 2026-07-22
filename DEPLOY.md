# Deployment (Docker + SQLite)

Self-contained image running Payload + Next.js with a SQLite DB and uploaded
media on **persistent volumes**.

> This deployment is **not password-gated**. Anything reachable at its URL is
> public, including `/admin` (which still requires a Payload login). To publish
> only the public site as static files instead, see [docs/STATIC.md](docs/STATIC.md).

## Build & push

```bash
docker build -t <registry>/msb-homepage:TAG .
docker push <registry>/msb-homepage:TAG
```

The image builds for its own platform. To target a different server arch, use
buildx, e.g. `docker buildx build --platform linux/amd64 -t ... --push .`

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

On boot the container **runs DB migrations** (schema), then a **seed** (RBAC
permissions + `Administrator`/`Redakteur` roles — idempotent), then starts.

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
