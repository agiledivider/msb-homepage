# E8 — Admins manage backups in the CMS (archive)

Archived 2026-11-22: all stories done. Summaries in [BACKLOG.md](../BACKLOG.md) under "Done".

Admins see, download and restore the site's backups themselves, without a shell on the server.

**Status:** proposed 2026-11-22. Builds on the nightly off-server backup (B1). Decided 2026-11-22: a restore always covers the whole site (database and media), no single pages or images.

### ✅ S8.1 — Admins see which backups exist (M) — 2026-11-22
Today only someone with a shell on the server or the backup password can tell whether backups run and which ones exist. Admins should see that in the CMS.

**AC:** an admin opens a backups view in the admin area and sees every backup with its date and size, and whether the last nightly run worked; when the newest backup is older than a day and a half, the view says so clearly; editors and reviewers can't see the view or reach its data.

**Implementation notes:** per D-005 the backup container serves an internal API (`scripts/backup/backup-api.mjs`, port 8081, `X-Backup-Token`, list only, no delete), started by `msb-backup schedule`; the scheduler records each run in `/work/last-run.json` (unknown after a container restart). The CMS view `/admin/backups` and its sidebar link come from `src/plugins/backups/`; `load.ts` checks admin rights before calling the API, parses the answer with zod and flags "stale" after 36 h. New setting `BACKUP_API_TOKEN` (required by `web` and `backup` in prod compose) plus `BACKUP_API_URL`; dev runs the real service with `pnpm backup:dev`. Covered by `tests/unit/backup-api.test.ts`, `tests/unit/backups-load.test.ts` and section 8 of `pnpm backup:test`; checked in the browser as admin, as editor and with the service down.

### ✅ S8.2 — Admins download a backup (M) — 2026-11-22
**Needs:** S8.1.
An admin who wants a copy of the site (before a big change, for an archive, to move servers) has no way to get one.

**AC:** an admin downloads one backup (database and media) as a single file from the backups view; the file is encrypted with a strong password the page generates and the admin copies before downloading (changed by Falk 2026-11-22; there is no unencrypted download); the page says how to open the file; the download is recorded with who and when, because the file contains everything, including user accounts and unpublished drafts; non-admins can't download.

**Implementation notes:** per D-006 the backup API's `POST /backups/<id>/download { passphrase, by }` streams `restic dump --archive tar` through gzip and encrypts it in OpenSSL `enc` format (AES-256-CBC, PBKDF2-SHA256, 600 000 rounds) with Node's crypto; the file opens with stock `openssl`. CMS: `BackupTable.tsx` panel generates the password (`passphrase.ts`, ~119 bits, rejection sampling), copy button, "saved" checkbox, then a form post to `/api/backups/download` (admin-only; password only in the body). The nightly prune waits for a download's read lock (`--retry-lock 2h`). Covered by unit tests (incl. decrypting with the `openssl` CLI) and section 10 of `pnpm backup:test` (plain OpenSSL in another image); downloaded and decrypted in the browser flow.

### ✅ S8.3 — Admins restore the site from a backup (L) — 2026-11-22
**Needs:** S8.1.
When content is lost or broken (an accidental delete, a bad import), getting it back needs someone on the server.

**AC:** an admin picks a backup, sees its date and what it contains, and has to confirm deliberately (e.g. by typing its date); before anything is overwritten, a fresh backup of the current state is made automatically, so the restore can be undone; afterwards the site and the CMS show the content of that date; a restore that fails halfway leaves the site as it was; every restore is recorded with who, when and which backup; non-admins can't restore.

**Implementation notes:** per D-007 the restore runs while the site keeps running: `msb-backup restore-live` unpacks and checks the backup (integrity, same `payload_migrations` as live; otherwise refused, nothing changed), takes a safety backup (tag `before-restore`, no prune, kept by `--keep-tag`, labelled "vor Wiederherstellung"), copies media in, swaps the database with SQLite's backup API (`.restore`, safe with the app open in rollback-journal mode), then removes media the backup lacks. Outcome codes in `/work/last-restore.json`, worded in German by `restoreText.ts`. API: `GET /backups/<id>/preview` (`msb-backup inspect`: counts backup vs live), `POST /backups/<id>/restore` (confirm = short id). CMS: `RestorePanel.tsx` (preview, typed short id, progress, outcome), admin-only endpoints `/api/backups/preview` and `/api/backups/restore`. Confirmation is the backup's id, not its date (two backups can share a date). Covered by unit tests and section 11 of `pnpm backup:test`; restored on dev in the browser while `next dev` kept running.

### ✅ S8.4 — Admins restore from an uploaded backup file (M) — 2026-11-22
**Needs:** S8.2, S8.3.
A backup downloaded earlier, or taken from another server, can't be brought back into the site.

**AC:** an admin uploads a file downloaded with S8.2, enters its password, and restores it the same way as in S8.3 (preview, deliberate confirmation, safety backup first); a wrong password, a file that isn't such a backup, or a damaged one is refused before anything changes.

**Implementation notes:** API `POST /uploads` (stream to `/work/uploads/<id>.enc`, size cap), `/uploads/<id>/check` (Node decrypts; `msb-backup stage-upload` lists the archive and refuses anything but plain files below `work/db/` and `volumes/media/`, then unpacks and prints the preview), `/uploads/<id>/restore` (confirm = upload id; `restore-upload` shares `apply_restore` with S8.3), `DELETE /uploads/<id>`. A wrong password keeps the file for a retry; uploads are removed after a restore and at container start. CMS: `UploadRestore.tsx` (XHR for upload progress, then `RestorePanel` with an upload source), endpoints `/api/backups/upload`, `upload-check`, `upload-restore`, `upload-discard`. `/api/` is now outside the Next proxy matcher, which would otherwise cut request bodies at 10 MB (`docs/runtime-traps.md`). Added on Falk's request: download passwords start with the backup id, and the upload form warns when file name and password name different backups. Covered by unit tests and section 12 of `pnpm backup:test` (incl. crafted archives); restored from an uploaded file by Falk in the browser.

### ✅ S8.5 — Admins take a backup now (S) — 2026-11-22
**Needs:** S8.1. **Source:** Falk 2026-11-22.
Backups only run once a night. Before a risky change (a big import, a restructure, an update) an admin wants a fresh backup first, and today that needs a shell on the server.

**AC:** an admin starts a backup from the backups view and sees that it is running; when it finishes, it appears in the list with the current time, and a failure is shown clearly; a second click while one is running starts no second backup; the nightly backup still runs as usual; the backup is recorded with who started it; non-admins can't start one.

**Implementation notes:** the backup API got `POST /backups` (starts `msb-backup backup` with `BACKUP_BY`, 409 while one runs) and a cheap `GET /status` (running + last run, no restic call). `msb-backup` takes a pid lock (`/work/backup.lock`, mkdir-atomic, stale locks taken over, cleared at container start) for every run, nightly or manual, and the last-run record now names who started it (`by`, null = nightly). CMS: "Jetzt sichern" (`BackupNow.tsx`) posts to `/api/backups/run`, polls `/api/backups/status` every 3 s and refreshes the page when done; both endpoints are admin-only (401/403) and log who started a backup. Covered by the unit tests and section 9 of `pnpm backup:test`; clicked through as admin in the browser, editor and anonymous refused.
