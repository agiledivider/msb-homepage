# Authoring stack & publishing

Two containers run wherever you author content. Neither serves the public site —
that's a third deployment, fed by an image these two produce.

```
┌─────────────┐  POST /publish   ┌──────────────┐  crane push  ┌──────────┐  pull  ┌──────────┐
│  payload    │ ───────────────▶ │  publisher   │ ───────────▶ │  ghcr.io │ ─────▶ │  nginx   │
│  admin+API  │   (RBAC checked) │  build+crawl │              │          │        │  public  │
└─────────────┘                  └──────────────┘              └──────────┘        └──────────┘
   volumes: db (rw), media (rw)      db (ro), media (ro)
```

`docker compose -f docker-compose.local.yml up -d --build` — admin on
<http://localhost:3000/admin>. See `.env.local.example` for the required values.

## Why the build runs in its own container

`next build` writes to `.next/` — the exact directory the Payload container is
serving from. Building in-process would take the admin down mid-publish and make
every editor wait on a CPU-bound job. The publisher also copies the SQLite file
before building: a build must not read a database that is being written to, and
the `-wal`/`-shm` sidecars come along or the newest commits are silently missed.

## Why there is no Docker socket

The obvious way to build an image from inside a container is to mount
`/var/run/docker.sock`. That is root-equivalent access to the host — handed to a
container that a web button can invoke.

The static image is only `nginx:alpine` + files, so nothing needs a real
Dockerfile build. [`crane`](https://github.com/google/go-containerregistry)
assembles and pushes the identical OCI image as an unprivileged process. It
reads the same `~/.docker/config.json` that `docker login ghcr.io` writes, which
is mounted read-only.

## Triggers

| Trigger | Who / when | Behaviour |
| --- | --- | --- |
| **Button** | reviewers + admins, from the dashboard | runs immediately |
| **On content change** | any publish/unpublish of blog, events, pages | debounced 5 min |
| **Nightly** | 03:00 Europe/Berlin | keeps time-sensitive content fresh |

All three funnel through one worker with a **single-flight lock**: a request
arriving mid-build is folded into one follow-up run rather than queueing a
pile-up. The debounce means ten edits in a row cost one build, not ten.

Nightly matters even with auto-publish: the events list, the homepage feed and
the hero's "next event" face are all relative to *now*, so a bundle that nobody
republishes drifts out of date on its own.

Auto-publish only fires when a document is published or unpublished — saving a
draft never spends a build. The hook is fire-and-forget: if the publisher is
down, the content still saves and the failure is logged, never surfaced as a
save error.

## Permissions

`/api/publish/trigger` and `/api/publish/status` require `editorialRoles` of
`reviewer` or `admin` (`src/plugins/publish/`). Editors get 403, and the
dashboard widget hides itself rather than showing a button that won't work.

The publisher is never exposed to the host — no `ports:` — so Payload's role
check is the only way in, backed by a shared `PUBLISH_TOKEN`.

## Updating the stack

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Data survives: `db` and `media` are named volumes, untouched by an image
rebuild. Schema changes apply themselves — the Payload container's CMD runs
`payload migrate` before `next start`, so a new migration in `src/migrations/`
is applied on the next start. (Payload's `push` is dev-only; production relies
on committed migrations.)

## Publishing by hand

The container path isn't required — the same pipeline runs locally:

```bash
pnpm dev:stop
NEXT_PUBLIC_SERVER_URL=https://msb-demo.idiot.games pnpm release:static
```

See [STATIC.md](STATIC.md) for what the bundle contains and the two constraints
that silently break it.

## Troubleshooting

- **Widget says "Publisher-Dienst nicht erreichbar"** — `PUBLISHER_URL` unset on
  the Payload container, or the publisher isn't up. `docker compose logs publisher`.
- **Push fails `UNAUTHORIZED`** — the mounted `config.json` has no ghcr token.
  Run `docker login ghcr.io` on the host and restart the publisher.
- **Push fails `proxyconnect … i/o timeout`** — Docker Desktop's internal proxy
  stalling (seen on macOS). Re-run; it is transient.
- **Published site missing new content** — the doc is probably still in
  editorial review. Only `_status: published` is crawled.
