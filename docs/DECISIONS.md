# Decisions

One entry per decision, so a choice is made once and recorded in one place. Supersede an entry with a new one; never edit history silently. Research docs link here, not the other way around.

Entries D-001 to D-004 were recorded retroactively on 2026-11-12 from the session notes kept at the time.

## D-001 Publish the public site as static files — Status: decided 2026-07-22
**Context:** the public site must be cheap and safe to host (Docker/nginx host or classic FTP webspace); Payload should not be publicly reachable.
**Options:** A) serve the Payload/Next app publicly; B) `next export`; C) crawl the running app into `dist/`.
**Decision:** C — `pnpm publish:static` crawls the app; Payload stays a local/private authoring instance.
**Why:**
- the app also hosts `/admin` and `/api`, and every frontend route is `force-dynamic`, so a literal export can't build;
- a static bundle has no `/admin`, which also sidesteps the demo-credentials go-live blocker;
- one bundle works on both targets: the publish step writes `nginx.conf` **and** `dist/.htaccess`.
**Evidence:** modelled on `~/Documents/workspace/payload-test` (`e435bbc`, `4bed8d9`); mechanics in `docs/STATIC.md`.
**Consequences:** no runtime API calls from the public site (`/events` no longer fetches `/api/events`); query-string views became client state mirrored with `history.replaceState`; the upcoming/past split is recomputed in the browser because a bundle goes stale; images need the pre-generated WebP ladder + custom loader; only media referenced in real HTML attributes is copied.
**Revisit when:** the site needs per-request personalisation or member login on the public pages.

## D-002 No password gate in front of the app — Status: decided 2026-07-22
**Context:** a Basic Auth gate in `src/proxy.ts` hid the pre-launch app.
**Decision:** removed on Falk's instruction; `src/proxy.ts` only does the legacy Joomla 301s.
**Consequences:** any Payload deployment is public the moment it has a URL; the demo-image credentials item in `docs/BACKLOG.md` is an unconditional go-live blocker. If a gate returns it must live in `proxy.ts` (Edge middleware can't read runtime env).
**Revisit when:** a Payload instance has to be reachable before launch.

## D-003 Replace makerspacebonn.de and keep its URLs — Status: decided 2026-07
**Context:** the old Joomla site is still online and has inbound links.
**Decision:** the new site replaces it; migrated articles keep their `legacyId`, and old Joomla URLs 301 to the new paths (`src/lib/legacyRedirects.ts`, `src/proxy.ts`; the static publisher emits the same rules).
**Consequences:** articles that are not migrated 404; scope of the remaining ~328 articles is open in `docs/BACKLOG.md`.

## D-004 Keep the true 3D prism hero on all widths — Status: decided 2026-07
**Context:** the prism flattened on iPhone, and the prototype used a single-face flip on mobile.
**Decision:** Falk chose the true prism on mobile too; the iPhone bug was `overflow-x:hidden` on `html,body`, not WebKit itself.
**Consequences:** no clipping `overflow` on any prism ancestor; the scene is inset instead (`docs/runtime-traps.md`).
**Revisit when:** a supported browser can't render it.

## D-005 The CMS reaches backups only through the backup container's API — Status: decided 2026-11-22
**Context:** admins should see, download and restore backups in the CMS (E8). Until now only the `backup` container held the restic password and repository credentials.
**Options:** A) the backup container serves a small internal API with a shared token, and the CMS calls it after checking that the user is an admin (the publish-service pattern); B) the app container gets restic and the backup credentials and reads the repository itself.
**Decision:** A (Falk). `scripts/backup/backup-api.mjs`, internal network only, `X-Backup-Token` compared in constant time, refuses to start without `BACKUP_API_TOKEN`.
**Why:** a break-in into the public CMS must not be able to delete or overwrite the backups. The API only offers what E8 needs; it has no delete or prune.
**Consequences:** every backup feature in the CMS is an API endpoint in the backup container first; downloads and restores (S8.2–S8.4) stream through it. `web` and `backup` both need `BACKUP_API_TOKEN`.
**Revisit when:** the backup storage supports append-only access for the app, or the backups move to a managed service with its own access control.

## D-006 Backup downloads are encrypted with a generated password, in OpenSSL's format — Status: decided 2026-11-22
**Context:** a downloaded backup (S8.2) holds everything, including users' password hashes, the MCP API key table and drafts, and ends up on a laptop, in a cloud sync or in mail.
**Options:** A) plain `.tar.gz`; B) encrypted with a password the admin chooses; C) encrypted with a password the CMS generates and shows once.
**Decision:** C (Falk): about 119 bits, six groups of four look-alike-free characters, with a copy button; the download starts only after the admin confirms they saved it. No plain download. Format: OpenSSL `enc`, AES-256-CBC with key and IV from PBKDF2-SHA256 (600 000 rounds), written by Node's crypto in the backup service, so the file opens with the stock `openssl` command.
**Why not age:** the `age` CLI takes a passphrase only from a terminal, so it can't encrypt a stream in a service.
**Consequences:** CBC has no authentication: a damaged or tampered file is noticed when gzip/tar fail, not before. S8.4 (restore from an uploaded file) must ask for the password and decrypt the same way. The password never reaches a URL or a log; it travels in the request body.
**Revisit when:** age (or another AEAD format with common tooling) can take a passphrase non-interactively, or files must be checked for tampering before they are unpacked.

## D-007 Restores from the CMS run while the site keeps running — Status: decided 2026-11-22
**Context:** S8.3 lets admins restore the whole site. The backup container may not stop or restart the web container (D-005: no Docker socket, no control over it), and the existing offline restore needs the web service stopped.
**Options:** A) swap the database file while the app runs; B) write the backup into the live database with SQLite's backup API (`sqlite3 live.db ".restore backup.db"`); C) give the backup service a way to stop and start the app.
**Decision:** B. The database runs in rollback-journal mode (`journal_mode=delete`), where the backup API writes under SQLite's own locks and other connections see the new content on their next transaction; a file swap (A) would leave the app on the old inode and break with WAL. Verified on dev: restored while `next dev` kept running, the page showed the old content at once and the CMS kept reading and writing.
**Order:** check the unpacked backup first (integrity, same migrations), then a safety backup (tag `before-restore`, no prune, kept by `--keep-tag`), then media in, then the database, then remove media the backup lacks. Anything failing before the database swap leaves the database untouched.
**Consequences:** a backup with other migrations than the live database is refused in the CMS, because the running code wouldn't match it; that case stays a server job (offline restore + `payload migrate`). Safety backups accumulate, one per restore (deduplicated, so small). If the database is ever switched to WAL, this needs re-checking.
**Revisit when:** the database moves off SQLite, to WAL mode, or the app gets a maintenance mode.

## D-008 Restores check the database structure, not the migration history — Status: decided 2026-11-22 (supersedes the compatibility rule in D-007)
**Context:** Falk downloaded a backup of his local dev setup and wanted to restore it on staging (same code version). D-007 refused it: dev uses Payload's `push` and records only `dev` in `payload_migrations`, staging records the migration names. The structures were identical (753 columns, no difference).
**Decision:** a backup fits when its tables and columns (name, type, NOT NULL) equal the live database's; the preview names the tables that differ. Before the swap the restored database takes over the live `payload_migrations` rows, so the next `payload migrate` on start sees the server's own history (a `dev` entry would stop it).
**Consequences:** dev → server works (S1.5 "content prepared before launch" can go this way). A backup from an older or newer code version is still refused; it needs both sides on one version. Defaults, indexes and foreign keys are not compared, only columns; a difference there would surface as a database error, not silently.
**Revisit when:** dev stops using `push`, or a migration changes only indexes or defaults that old data would violate.

## D-009 Servers accept only Kanidm logins; password login is the break-glass switch — Status: decided 2026-11-22
**Context:** a dev backup restored onto staging brought the local test accounts along, among them an admin, all with the password `test`, on a site with no gate in front (D-002). Until now email/password login stayed available next to Kanidm, as break-glass for a broken Kanidm setup (a wrong claim name strips everyone's roles).
**Options:** A) a setting `PASSWORD_LOGIN`, off on servers by default, on in dev; B) password login off everywhere, for good.
**Decision:** A (Falk). Off: Payload's local strategy is disabled (`disableLocalStrategy` with `enableFields`, so the schema doesn't change and switching needs no migration): login, forgot/reset password and first-user registration are refused, and the login page shows only the Kanidm button. Break-glass: someone with server access sets `PASSWORD_LOGIN=on`, recreates the container, logs in with a local admin, and switches back.
**Consequences:** accounts from a restored dev backup can't be used on a server. A server without Kanidm configured has no way in (the app logs a warning; the publisher shares the config, so it can't refuse to start). S1.4's "emergency admin can log in" now means: after switching password login on.
**Revisit when:** the CMS gets a gate in front again (D-002), or Kanidm offers its own break-glass account.

## D-010 Every database is built by migrations, also in dev — Status: decided 2026-11-22 (supersedes D-008's history rule)
**Context:** dev used Payload's `push`, servers `payload migrate`. A dev database has the right tables but only a `dev` entry in `payload_migrations`, so D-008 had a restore take over the server's history. After a dev backup was restored on staging, the server's history lagged behind its tables and the next start failed (`table pages_blocks_quote already exists`). Building from scratch also failed: the S3.7 migration converted /verein through the Local API, which queries block tables that only later migrations create.
**Options:** A) keep `push` in dev and patch histories on every restore; B) migrations everywhere, `push` only for throwaway test databases (Falk).
**Decision:** B. `push` is on only when `NODE_ENV=test`; `pnpm dev:start` runs `payload migrate` first. Every database carries its own true history, and a restore keeps the backup's (it takes the server's only for an old dev backup that has just `dev`). Content conversions that need the Local API run in `src/seed/prod.ts` after all migrations, never inside a migration. `tests/integration/migrations-match-schema.test.ts` builds a database from the migrations and compares it with the config's schema.
**Consequences:** a schema change needs `pnpm payload migrate:create <name>` and a migrate (dev:start does it) before it shows locally; forgetting the migration fails `pnpm test`. Backups move freely between dev and servers on the same code version. Existing dev databases need their history adopted once (structure check, then the migration names; see `docs/runtime-traps.md`).
**Revisit when:** Payload's push can record migration history, or the project moves off SQLite.
