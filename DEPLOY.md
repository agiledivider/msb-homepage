# Deployment (Docker + SQLite)

Self-contained image running Payload + Next.js with a SQLite DB and uploaded
media on **persistent volumes**. A simple HTTP Basic Auth password gates the whole
site until you're ready to go public.

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
   BASIC_AUTH_USER=msb
   BASIC_AUTH_PASSWORD=<your password>
   ```

2. Start it:

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

On boot the container **runs DB migrations** (creates the schema on a fresh `db`
volume; a no-op afterwards), then starts the server. Open `/admin` and create the
first user.

## What persists

- **`db` volume** → `/app/data/msb.db` (SQLite). Keep it to keep your content.
- **`media` volume** → `/app/public/media` (uploaded images).

## The password gate

`BASIC_AUTH_USER` + `BASIC_AUTH_PASSWORD` enable a Basic Auth prompt in front of
everything (site, `/admin`, `/api`). Remove both env vars (and restart) to open
the site to the public. This is separate from Payload's own admin login.

## Schema changes

The app uses SQLite `push` in **dev only**. In prod it applies **migrations**.
After changing collections/fields, generate a new migration and commit it:

```bash
pnpm payload migrate:create <name>
```

It'll be applied automatically on the next container start.
