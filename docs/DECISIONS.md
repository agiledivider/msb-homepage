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
