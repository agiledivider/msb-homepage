# Authoring stack & publishing

Three containers. Two of them are the authoring stack; the third stands in for
the public host so the whole loop can be exercised locally.

```
┌─────────────┐  POST /publish   ┌──────────────┐  crane push  ┌──────────┐  pull  ┌──────────┐
│  payload    │ ───────────────▶ │  publisher   │ ───────────▶ │  ghcr.io │ ─────▶ │  public  │
│  admin+API  │   (RBAC checked) │  build+crawl │              │          │        │  nginx   │
└─────────────┘                  └──────┬───────┘              └──────────┘        └──────────┘
   db (rw), media (rw)                  │ db (ro), media (ro)
                                        └── site_html ──▶ [ web ]  local preview, :8080
```

```bash
cp .env.local.example .env    # fill in PAYLOAD_SECRET + PUBLISH_TOKEN
docker compose up -d --build
```

- admin → <http://localhost:3000/admin>
- local preview of the published site → <http://localhost:8080> (after the first
  publish; set `WEB_PORT` if 8080 is taken)

In production the site is a separate deployment that pulls the pushed image
(`docker-compose.demo.yml`). The local `web` container serves the same snapshot
from a shared volume, so you can check a build without a registry round trip.

**`PUSH_IMAGE` defaults to `false`.** A local run must not be able to overwrite
the production tag. Set it `true` (plus credentials, below) for a real release.

## Why the build runs in its own container

`next build` writes to `.next/` — the exact directory the Payload container is
serving from. Building in-process would take the admin down mid-publish and make
every editor wait on a CPU-bound job. The publisher also copies the SQLite file
before building: a build must not read a database that is being written to, and
the `-wal`/`-shm` sidecars come along or the newest commits are silently missed.

For the same reason the build is spawned asynchronously rather than run with
`execSync` — the publisher serves its HTTP API from that process, and a
synchronous build froze `/status` for the whole build.

## Why there is no Docker socket

The obvious way to build an image from inside a container is to mount
`/var/run/docker.sock`. That is root-equivalent access to the host — handed to a
container that a web button can invoke.

The static image is only `nginx:alpine` + files, so nothing needs a real
Dockerfile build. [`crane`](https://github.com/google/go-containerregistry)
assembles and pushes the identical OCI image as an unprivileged process.

### Registry credentials

Set `GHCR_USER` and `GHCR_TOKEN` (a GitHub PAT with `write:packages`) in `.env`.
The publisher writes them to a private config it owns, mode 0600, never logged.

**Do not mount the host's `~/.docker`.** On a Docker Desktop machine it stores
tokens in the OS keychain via `credsStore`, so the registry entries in
`config.json` are empty and the only thing the container inherits is an
instruction to exec a credential helper that does not exist on Linux — which
breaks even the *anonymous* pull of the nginx base image.

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

## What the dashboard shows

The widget reports the live stage, a weighted progress bar, elapsed time and an
ETA taken from the last successful run, plus who triggered it:

```
◐ Next.js-Build — kompilieren · 3% · 25s · noch ca. 52s
  manual by reviewer@test.de
  ▓▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
```

Stages are weighted by measured share of wall-clock rather than counted equally,
and the Next build (~40% of the total, and it prints no count of its own) is
tracked by parsing its milestones. A bar that sits at one value reads as a hang.

It polls every 2s while a publish is running and every 15s when idle, so a run
started by the auto-publish hook, the nightly job or another editor shows up
without a reload. A debounced auto-publish appears with the time it is due.

A publish that failed shows the error; the last result survives a container
update because the publisher's state lives on the `publisher_state` volume.

## Permissions

`/api/publish/trigger` and `/api/publish/status` require `editorialRoles` of
`reviewer` or `admin` (`src/plugins/publish/`). Editors get 403, and the
dashboard widget hides itself rather than showing a button that won't work.

The publisher is never exposed to the host — no `ports:` — so Payload's role
check is the only way in, backed by a shared `PUBLISH_TOKEN`.

## Updating the stack

```bash
docker compose up -d --build
```

Use `--build` when code changed: `--force-recreate` alone restarts the container
on the *old* image, which silently tests the wrong thing.

Data survives: `db`, `media` and `publisher_state` are named volumes, untouched
by an image rebuild. Schema changes apply themselves — the Payload container's
CMD runs `payload migrate` before `next start`, so a new migration in
`src/migrations/` is applied on the next start. (Payload's `push` is dev-only;
production relies on committed migrations.)

## Publishing by hand

The container path isn't required — the same pipeline runs locally:

```bash
pnpm dev:stop
NEXT_PUBLIC_SERVER_URL=https://msb-demo.idiot.games pnpm release:static
```

See [STATIC.md](STATIC.md) for what the bundle contains and the two constraints
that silently break it.

## Before a real release

- **`PUBLIC_SITE_URL` must be the public origin.** It is compiled into
  `metadataBase`, `sitemap.xml`, `robots.txt`, `og:image` and the iCal feed. If
  it still points at the local preview, the pushed image advertises `localhost`.
- **`GIT_SHA`** — set it (`GIT_SHA=$(git rev-parse --short HEAD)`) or the
  rollback tag is a meaningless `nogit-<date>`.
- **The publisher builds from the container's database**, not your working copy.
  If you have been editing locally, get that content into the `db` volume first
  or the release will regress the site.

## Troubleshooting

- **"Publisher-Dienst nicht erreichbar"** — `PUBLISHER_URL` unset on the Payload
  container, or the publisher is down. `docker compose logs publisher`. (It no
  longer means "a build is in progress"; `/status` stays responsive during one.)
- **Push fails `docker-credential-desktop … not found`** — a host `~/.docker` is
  mounted into the publisher. Remove the mount; use `GHCR_USER`/`GHCR_TOKEN`.
- **Push fails `UNAUTHORIZED`/`denied`** — the PAT lacks `write:packages`, or
  `GHCR_USER`/`GHCR_TOKEN` are unset in the publisher's environment.
- **Push fails `proxyconnect … i/o timeout`** — Docker Desktop's internal proxy
  stalling (seen on macOS). Re-run; it is transient.
- **"refusing to publish a partial snapshot"** — routes failed to render, so the
  build was rejected rather than shipped empty. The publisher log has the first
  failures; a wrong/empty database is the usual cause. `PUBLISH_ALLOW_PARTIAL=true`
  overrides, but check *why* first.
- **Published site missing new content** — the doc is probably still in
  editorial review. Only `_status: published` is crawled.
