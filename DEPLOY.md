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
therefore strips everyone who logs in via Kanidm, so keep the local password admin
as break-glass. To cut someone off *immediately*, remove them from
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
the newest backup is older than 36 h. "Jetzt sichern" there starts a backup at
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
whose migrations differ from the live database is refused: that needs the
offline `restore` below plus `payload migrate`. "Aus einer Backup-Datei
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

## Schema changes

The app uses SQLite `push` in **dev only**. In prod it applies **migrations**.
After changing collections/fields, generate a new migration and commit it:

```bash
pnpm payload migrate:create <name>
```

It'll be applied automatically on the next container start.
