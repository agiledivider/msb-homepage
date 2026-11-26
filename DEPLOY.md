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

First it runs `pnpm migrate:check`: this commit's migrations and the prod seed,
on a **copy** of real data, exactly as the container runs them on start. The data
is the newest backup download in `~/Downloads` (`/admin` → Backups → download;
it asks for that backup's passphrase), or `MIGRATE_CHECK_DB=path` (a `.enc`
download or a plain `msb.db`). If they fail, nothing is pushed. Skip only with a
reason: `SKIP_MIGRATE_CHECK=1 pnpm release:app`.

Then it builds the app image and pushes it, tagged both `:latest` and `:<git-sha>` (so a
bad release can be rolled back to a known image). Defaults:

| var        | default                              | note                          |
| ---------- | ------------------------------------ | ----------------------------- |
| `APP_IMAGE`| `ghcr.io/agiledivider/msb-homepage`  | target repository             |
| `TAG`      | `latest`                             | moving tag                    |
| `PLATFORM` | `linux/amd64`                        | server arch (cross-built)     |

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

## Single sign-on (Kanidm / OIDC)

Optional. When configured, `/admin/login` gains a **"Sign in with Kanidm"**
button next to the normal email/password form — password login stays available,
so keep one local admin as a break-glass account for when the IdP is
unreachable. Leave the vars unset for password-only login.

### Configure Kanidm

`scripts/kanidm-setup.sh` sets up the OAuth2 client and its groups. Run it
on your machine with the `kanidm` CLI logged in as `idm_admin@idm.msbid.de`
(`kanidm login -D idm_admin@idm.msbid.de`; other account: `--account`); without
`--apply` it only prints the plan:

```bash
scripts/kanidm-setup.sh --url https://payload.idiot.games            # dry run
scripts/kanidm-setup.sh --url https://payload.idiot.games --apply
#   --client NAME (default payload)   --managed-by NAME (default vereinssoftware_svc)
```

Everything is derived from the client name (here `payload`):

| Kanidm | Purpose | `cms_roles` | CMS role |
|---|---|---|---|
| `payload` | OAuth2 client, strict redirect `<url>/api/users/oauth/kanidm/callback` | – | – |
| `dienst_payload` | scope map `openid email profile`: may log in | `editor` | Redakteur |
| `dienst_payload_reviewer` | nested in `dienst_payload` | `reviewer` | Reviewer: approves and publishes |
| `dienst_payload_admin` | nested in `dienst_payload` | `admin` | Administrator: also users and roles |

All three groups are entry-managed by `vereinssoftware_svc`, so the Vereinssoftware
can maintain their members. A person joins exactly one group; an admin's
token carries `cms_roles: ["editor", "admin"]`. Re-running the script is safe; it never deletes anything. With `--apply` it
ends by printing the three `KANIDM_*` lines for the server's `.env`, client
secret included; the CMS server itself needs no `kanidm` CLI. The app reads
the claim named `cms_roles` unless you set `KANIDM_ROLES_CLAIM`.

Roles are **overwritten at every Kanidm login**: removing someone from all role
groups takes away their CMS rights the next time they log in. A wrong claim name
therefore strips everyone who logs in via Kanidm; see "Password login" below for
the way back in. To cut someone off *immediately*, remove them from
their `dienst_<client>` group and delete their sessions in the CMS. Kanidm accounts are matched
to CMS accounts by email, and only a verified email (`email_verified: true`) is
accepted; anything else is refused at login.

The redirect URL must be exactly `<NEXT_PUBLIC_SERVER_URL>/api/users/oauth/kanidm/callback`.
Kanidm's PKCE (S256) and HTTP-Basic token auth are both handled by the app.

### Configure the app

Add to `.env` (the secret belongs here, never on a command line):

```env
KANIDM_ISSUER=https://idm.example.com        # base URL, no trailing slash
KANIDM_CLIENT_ID=payload                      # the script's --client
KANIDM_CLIENT_SECRET=<see the script's last step; never paste it into a chat>
# optional — only if you named the claim something other than cms_roles:
# KANIDM_ROLES_CLAIM=cms_roles
```

Users are provisioned on first login and matched to any existing account by
email. **Roles are re-synced from the `cms_roles` claim on every SSO login** —
so Kanidm group membership is the source of truth, and changes take effect on the
user's next login. Roles are hierarchical: admin ⊇ reviewer ⊇ editor. Manage
roles in Kanidm, not in `/admin`, for SSO users. Implementation: `src/plugins/oidc/`.

### Password login (off on servers)

On servers the CMS accepts **only Kanidm**: `PASSWORD_LOGIN` defaults to `off`
in production, so email/password login, "forgot password" and first-user
registration are refused, and the login page shows only the Kanidm button. This
also covers accounts that came along in a restored dev backup (test users with
the password `test`). Locally (`pnpm dev`) it defaults to `on`.

**Emergency access** (Kanidm down, or a wrong claim name stripped everyone's
roles): someone with server access sets `PASSWORD_LOGIN=on` in `.env`, runs
`docker compose up -d --force-recreate <app service>`, logs in with a local
admin account, fixes things, and sets it back to `off` (recreate again). Keep
one local admin with a strong password in the password manager for this; with
password login off, its password can't be used by anyone else.

If neither Kanidm (`KANIDM_*`) nor password login is available, the app logs a
warning at start: nobody can log in.

## What persists

- **`db` volume** → `/app/data/msb.db` (SQLite). Keep it to keep your content.
- **`media` volume** → `/app/public/media` (uploaded images).

Both are backed up nightly; see [Backups](#backups).

## Backups

The `backup` service in `docker-compose.prod.yml` backs up the `db` and `media`
volumes every night at `BACKUP_AT` (default 03:30 Europe/Berlin) with
[restic](https://restic.net): encrypted, deduplicated, kept as 7 daily, 4 weekly
and 12 monthly snapshots, followed by a `restic check`. The database is copied
with SQLite's online backup, so the app keeps running. Image: `msb-backup`
(`Dockerfile.backup`, built by CI); script: `scripts/backup/msb-backup.sh`.

**Setup:** set `RESTIC_REPOSITORY` (a place *off this server*: S3-compatible
storage, Backblaze B2, a Storage Box via `sftp:` or `rest:`) and
`RESTIC_PASSWORD` in `.env`, plus the backend's credentials (see
`.env.production.example`). The compose stack refuses to start without them;
the repository is created on first start. **Keep `RESTIC_PASSWORD` in the
password manager as well:** without it the backups cannot be read.

### Hetzner Storage Box (sftp)

restic reaches the box over SFTP on **port 23**. The `backup` service mounts
`./backup-ssh` (or `BACKUP_SSH_DIR`) read-only as its `~/.ssh`; the directory
is gitignored and unused by other backends.

1. In the Hetzner Console, order a Storage Box (BX11 is plenty), enable
   **SSH support** and **External reachability**. A sub-account with its own
   directory keeps the homepage apart from anything else on the box.
   **With a sub-account, use its own names everywhere below:** user
   `uXXXXX-subN` *and* host `uXXXXX-subN.your-storagebox.de` (in
   `install-ssh-key`, `ssh-keyscan` and `config`). The box has the same host key
   under both names, but ssh checks `known_hosts` by name: a key scanned for the
   main host fails with "Host key verification failed".
2. Next to `docker-compose.prod.yml` on the server, create the key, install it
   on the box (asks for the box password once) and pin the host key:
   ```bash
   mkdir backup-ssh && ssh-keygen -t ed25519 -N '' -C msb-backup -f backup-ssh/id_ed25519
   cat backup-ssh/id_ed25519.pub | ssh -p 23 uXXXXX@uXXXXX.your-storagebox.de install-ssh-key
   ssh-keyscan -p 23 uXXXXX.your-storagebox.de > backup-ssh/known_hosts
   ```
3. Write `backup-ssh/config`:
   ```
   Host storagebox
     HostName uXXXXX.your-storagebox.de
     User uXXXXX
     Port 23
     IdentityFile ~/.ssh/id_ed25519
   ```
4. Hand the directory to the container's user (uid 1001); ssh ignores a key
   others can read:
   ```bash
   sudo chown -R 1001:1001 backup-ssh && chmod 700 backup-ssh && chmod 600 backup-ssh/*
   ```
5. In `.env`: `RESTIC_REPOSITORY=sftp:storagebox:msb-homepage` (a folder in the
   box's home) plus `RESTIC_PASSWORD`. Then `docker compose -f
   docker-compose.prod.yml run --rm backup backup` and look for "backup finished".
6. Start (or **recreate**) the service: `docker compose -f docker-compose.prod.yml
   up -d --force-recreate backup`. A running container keeps the mounts and
   `.env` values it was created with, and restarts with them: after changing
   `.env`, `BACKUP_SSH_DIR` or replacing `backup-ssh/`, a one-off `run` works
   while the service still fails until it is recreated.

`pnpm backup:check` on your laptop uses `~/.ssh` (or `BACKUP_SSH_DIR`) and the
same `Host storagebox` entry: add your own key to the box with `install-ssh-key`
and the config block to your `~/.ssh/config`, rather than copying the server's key.
`known_hosts` must hold the box's key; a missing entry fails the backup
instead of trusting an unknown host.

**Check it works:**

```bash
docker compose -f docker-compose.prod.yml logs backup          # "repository ok", nightly "backup finished"
docker compose -f docker-compose.prod.yml run --rm backup backup     # one backup now
docker compose -f docker-compose.prod.yml run --rm backup snapshots  # list backups
```

**Check from your own machine** (proves the backups really are off the server
and readable with the stored password; needs only Docker):

```bash
export RESTIC_REPOSITORY=… RESTIC_PASSWORD=…   # + backend keys, same as on the server
pnpm backup:check                    # snapshots, newest < 36 h old, verify 10 % of the data
pnpm backup:check --restore ./restore-check   # also restore the latest backup and look inside
```

**In the admin:** admins see the backups at `/admin/backups` (sidebar
"Backups"): date, size, whether the last nightly run worked, and a warning when
the newest backup is older than 36 h. It also shows the storage the backups
use and, where the storage reports it, how much is left, with a warning under
10 % free or less room than one more full backup (S9.2): a local repository
reports its disk, an `sftp:host:path` one the server's `df` (a Storage Box
answers with its quota), S3/B2/`rest:` report no limit, and the page says so.
A backup with the same content as the one before it (a quiet day) is greyed
out and marked "unverändert" (S9.3): the backup service compares neighbours
with `restic diff` (only file times differ → unchanged) and keeps the results
in `/work/diffs.json`; after a container recreate it compares them again.
Nothing is deleted because of it.
"Jetzt sichern" there starts a backup at
once (one at a time: a lock in the script also covers the nightly run; the log
and the page name who started it). "Herunterladen" next to a backup gives
it as one encrypted file, streamed straight from the repository: the page
generates a password (shown once, with a copy button), and the file opens with
`openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in F -out backup.tar.gz`
(inside: database under `work/db/`, media under `volumes/media/`). There is no
unencrypted download; the log names who downloaded which backup. "Wiederherstellen" resets the whole site (database and media) to a backup
while it keeps running: the page shows what the backup holds next to the live
site, the admin types the backup's id, and the backup service then takes a
safety backup (tag `before-restore`, never pruned, marked "vor
Wiederherstellung" in the list, so the restore can be undone the same way),
adds the media, swaps the database with SQLite's backup API (atomic, safe with
the app open; no restart) and removes media the backup didn't have. A backup
whose database **structure** (tables and columns) differs from the live one is
refused, and the preview names the tables; bring both to the same version
first. The migration history doesn't count: a backup from a local dev setup
(which records only "dev" there) restores onto a server with the same code, and
the server keeps its own migration history, so `payload migrate` on the next
start sees what it expects. "Aus einer Backup-Datei
wiederherstellen" does the same with a downloaded file and its password: the
file streams to the backup service (up to `BACKUP_UPLOAD_MAX_BYTES`, default
20 GB, so `/work` needs room for it twice), is decrypted and checked (only
plain files below `work/db/` and `volumes/media/`), previewed, restored like a
backup, and deleted afterwards. Passwords start with the backup's id, as the
file name ends with it. Publish the static site again afterwards. The "last restore" line, like "last run", is gone after the backup
container is recreated; the log keeps both. The
`backup` service serves this through a small internal API
(`scripts/backup/backup-api.mjs`, port 8081, not published) that lists,
starts, downloads and restores backups; it can't delete. A download holds a restic read
lock; the nightly prune waits for it (`--retry-lock 2h`). Set `BACKUP_API_TOKEN` in `.env`
(`openssl rand -hex 32`); compose passes it to `web` and `backup`, and neither
starts without it. The "last run" line is unknown after the backup container
restarts until its next nightly run.

**Alerts:** not set up yet. Set `BACKUP_PING_URL` to a healthchecks.io-style URL
and that service alerts when a backup fails *or doesn't run*. Until then, look at
`snapshots` now and then.

**Restore** (onto a fresh server or after data loss). The web service must be
stopped, so nothing writes to the database meanwhile:

```bash
docker compose -f docker-compose.prod.yml stop web
docker compose -f docker-compose.prod.yml run --rm backup restore            # dry run: shows the plan
docker compose -f docker-compose.prod.yml run --rm backup restore --apply    # latest snapshot
#   restore <snapshot-id> --apply     a specific one (ids from `snapshots`)
#   add --overwrite if the volumes aren't empty; the old DB stays as msb.db.before-restore-<time>
docker compose -f docker-compose.prod.yml start web
```

On a fresh server, run the restore **before** the first `up -d`,
or the first-boot seed fills the empty
database and you need `--overwrite`. Media files that aren't in the backup are
left in place by `--overwrite`. `pnpm backup:test` proves the round trip locally
(Docker, throwaway volumes and repository).

## Moving to a new server

Backups hold the database and the media, **not the secrets in `.env`**. A
download from the admin leaves the server, so it must not carry its keys. Keep
these in the password manager, and bring them to the new server's `.env`:

| Variable | Without the old value |
|---|---|
| `RESTIC_PASSWORD` | **the backups can't be read at all.** Nothing else helps. |
| `PAYLOAD_SECRET` | passwords still work (hashed per user with a salt), but every Claude/MCP key stops working and must be issued again (Verwaltung → KI-Zugänge): Payload finds keys by an HMAC keyed with this secret. Everyone has to log in again, and old draft preview links stop working. |
| `BACKUP_API_TOKEN` | nothing lost: it only links `web` and `backup` on one server; a new one is fine. |
| `KANIDM_CLIENT_SECRET` | sign-in via Kanidm fails until the new value is set; it can be re-issued in Kanidm. |
| backend keys (`AWS_*`, `B2_*`, `backup-ssh/`) | no access to the backup storage until they're set up again. |

The app refuses to start without `PAYLOAD_SECRET`, and in production with the
example value from `.env.production.example` (`src/lib/payloadSecret.ts`).

Steps: set up the new server as in [Run on a server](#run-on-a-server) with the
old `PAYLOAD_SECRET` and the backup settings, restore the latest backup
offline as above **before** the first `up -d`, then start the stack and
publish the static site again.

**App version:** restore with the current image (`latest`), never one older
than the backup. A backup carries its database's migration history; the first
start runs `payload migrate` and brings an older backup up to date, while an
older image doesn't know a newer backup's tables. `restore-file` (below) prints
the backup's newest migration.

### Only a downloaded backup file is left

When the backup storage is gone too, a file from `/admin/backups` →
"Herunterladen" (`msb-backup-<time>-<id>.tar.gz.enc`) and its password are
enough. `restore-file` needs no repository, no running site and no backup
settings that work: it fills the empty volumes, and the first start does the
rest. Set up the new server as above (`.env` with the old `PAYLOAD_SECRET`;
`RESTIC_REPOSITORY` / `RESTIC_PASSWORD` must be set for compose to start, so
put in the new backup storage, or any placeholder until you have one), then,
**before** the first `up -d`:

```bash
f=msb-backup-20261126T0414Z-38345bb8.tar.gz.enc   # next to docker-compose.prod.yml
docker compose -f docker-compose.prod.yml run --rm --no-deps -it \
  -v "$PWD/$f:/restore/$f:ro" backup restore-file "/restore/$f"           # dry run: asks for the password, shows what's inside
docker compose -f docker-compose.prod.yml run --rm --no-deps -it \
  -v "$PWD/$f:/restore/$f:ro" backup restore-file "/restore/$f" --apply   # puts database and media into the volumes
docker compose -f docker-compose.prod.yml up -d
```

It refuses volumes that already hold data (add `--overwrite`; the old database
is kept as `msb.db.before-restore-<time>`). On a running site use the admin
instead ("Aus einer Backup-Datei wiederherstellen"). Then set up real backup
storage before the next night, and publish the static site again. Tested
2026-11-26 with a real staging backup (7 pages, 77 posts, 231 events, 949
media files) onto an empty stack: same rows and update times, every media file
byte-identical, site and images served (B1); `pnpm backup:test` covers it.

## Schema changes

The app uses SQLite `push` in **dev only**. In prod it applies **migrations**.
After changing collections/fields, generate a new migration and commit it:

```bash
pnpm payload migrate:create <name>
```

It'll be applied automatically on the next container start.
