#!/usr/bin/env node
// backup-api — the backup container's internal HTTP API (E8).
//
// Runs next to the nightly scheduler in the `backup` service (started by
// `msb-backup schedule`). Only the CMS calls it, over the internal compose
// network and only after checking that the user is an admin, so the restic
// password never leaves this container. There is deliberately no way to
// delete or prune backups through it (D-005).
//
//   GET  /backups  → { snapshots: [{ id, shortId, time, sizeBytes }], lastRun, running, storage }   (S8.1)
//        storage: { usedBytes, totalBytes, freeBytes } (null where unknown), or null   (S9.2)
//        each snapshot also has `unchanged`: same content as the next older one
//        (true/false), or null while not compared yet   (S9.3)
//   GET  /status   → { lastRun, running }      cheap: no restic call, for polling
//   POST /backups  { by } → 202 { started: true }, or 409 { running } if one runs   (S8.5)
//   POST /backups/<id>/download { passphrase, by } → the whole backup (database
//        + media) as one .tar.gz, encrypted with the passphrase, streamed (S8.2).
//        Format: OpenSSL `enc` (AES-256-CBC, key from PBKDF2-SHA256, 600 000
//        rounds), so it opens anywhere with
//          openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in F -out backup.tar.gz
//        There is no unencrypted download.
//   GET  /backups/<id>/preview → what the backup holds next to the live site, and
//        whether it fits the running code (same database structure)   (S8.3)
//   POST /backups/<id>/restore { confirm, by } → 202, restores while the site runs
//        (`msb-backup restore-live`: safety backup first). `confirm` must be the
//        backup's short id; 409 while a backup or restore runs   (S8.3)
//
//   POST   /uploads (raw body: a file from the download above) → 201 { uploadId }   (S8.4)
//   POST   /uploads/<id>/check { passphrase } → 200 { uploadId, ...preview }, or 422
//          { code: 'wrong-password' | 'not-a-backup' } (a wrong password keeps the file to retry)
//   POST   /uploads/<id>/restore { confirm, by } → 202; confirm must be the upload id
//   DELETE /uploads/<id> → 204, the upload is gone
//
// lastRun: { status: 'ok'|'failed', at, by } (by: who started it, null = nightly)
// lastRestore: { status, at, by, snapshot, safety, message } or null
// running: { startedAt, by, kind: 'backup'|'restore', snapshot } or null
//
// Auth: header `X-Backup-Token` must equal BACKUP_API_TOKEN (compared in
// constant time); without the token the API refuses to start.
// Env: BACKUP_API_TOKEN (required), BACKUP_API_PORT (default 8081),
//      BACKUP_STATUS_FILE (default /work/last-run.json, written by msb-backup),
//      BACKUP_LOCK_DIR (default /work/backup.lock, held by msb-backup while a backup runs),
//      RESTIC_REPOSITORY (where the free space is read from, S9.2),
//      BACKUP_DIFF_CACHE (default /work/diffs.json: comparisons already made, S9.3).
// Plain JS without dependencies: the backup image has Node but no node_modules.

import { execFile, spawn } from 'node:child_process'
import { createCipheriv, createDecipheriv, createHash, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, open, readFile, rename, rm, stat, statfs, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { PassThrough, pipeline } from 'node:stream'
import { pipeline as pipelineAsync } from 'node:stream/promises'
import { promisify } from 'node:util'
import { createGzip } from 'node:zlib'

/** @typedef {{ id: string, shortId: string, time: string, sizeBytes: number | null, beforeRestore: boolean }} Snapshot */
/** @typedef {{ status: 'ok' | 'failed', at: string, by: string | null }} LastRun */
/** @typedef {{ usedBytes: number | null, totalBytes: number | null, freeBytes: number | null }} Storage */
/** @typedef {{ startedAt: string, by: string | null, kind: 'backup' | 'restore', snapshot: string | null }} Running */
/** @typedef {{ status: 'ok' | 'failed', at: string, by: string | null, source: 'backup' | 'upload', snapshot: string, safety: string | null, code: RestoreCode, message: string }} LastRestore */
/** @typedef {'restored' | 'unreadable' | 'no-database' | 'damaged' | 'other-version' | 'safety-failed' | 'media-failed' | 'database-failed' | 'unknown'} RestoreCode */

/** What `msb-backup restore-live` records as the outcome; the CMS words each one. */
export const RESTORE_CODES = [
  'restored',
  'unreadable',
  'no-database',
  'damaged',
  'other-version',
  'safety-failed',
  'media-failed',
  'database-failed',
]
/** @typedef {{ integrity: 'ok' | 'damaged', compatible: boolean, differences: string[], backup: Contents, live: Contents }} Preview */
/** @typedef {{ counts: Record<string, number | null>, mediaFiles: number }} Contents */

const isIsoTime = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

/**
 * Who started a backup, as it may appear in logs and the status file: an
 * email-like name, nothing else (the shell writes it into JSON).
 * @returns {string | null}
 */
export function cleanBy(v) {
  if (typeof v !== 'string') return null
  const s = v.replace(/[^A-Za-z0-9@._+-]/g, '').slice(0, 120)
  return s || null
}

/**
 * `restic snapshots --json` → the list the CMS shows, newest first.
 * The size is what the snapshot covered (restic ≥ 0.17 records it); older
 * snapshots have none, which stays `null` rather than a made-up 0.
 * @returns {Snapshot[]}
 */
export function parseSnapshots(json) {
  if (!Array.isArray(json)) throw new Error('restic snapshots: expected a JSON array')
  return json
    .map((s, i) => {
      if (!s || typeof s.id !== 'string' || !s.id || !isIsoTime(s.time)) {
        throw new Error(`restic snapshots: entry ${i} has no id or time`)
      }
      const size = s.summary?.total_bytes_processed
      return {
        id: s.id,
        shortId: typeof s.short_id === 'string' && s.short_id ? s.short_id : s.id.slice(0, 8),
        time: new Date(s.time).toISOString(),
        sizeBytes: Number.isSafeInteger(size) && size >= 0 ? size : null,
        // The safety backup a restore took of the state it replaced (S8.3).
        beforeRestore: Array.isArray(s.tags) && s.tags.includes('before-restore'),
      }
    })
    .sort((a, b) => b.time.localeCompare(a.time))
}

const byteCount = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null)

/**
 * `restic stats --mode raw-data --json` → what the backups take up in the
 * repository (deduplicated and compressed), or null if restic didn't say (S9.2).
 * @returns {number | null}
 */
export function parseRepoUsed(json) {
  return byteCount(json?.total_size)
}

/**
 * Where the repository lives, as far as its free space can be read: a local
 * path (statfs), `sftp:[user@]host:path` (the SFTP `df` command, which a
 * Hetzner Storage Box answers with its quota), or anything else (S3, B2,
 * rest:, URL forms), whose limit restic can't see.
 * @returns {{ kind: 'local', path: string } | { kind: 'sftp', host: string, path: string } | { kind: 'other' }}
 */
export function repoLocation(repo) {
  if (typeof repo !== 'string') return { kind: 'other' }
  if (repo.startsWith('/')) return { kind: 'local', path: repo }
  const sftp = /^sftp:([^/:][^:]*):(.*)$/.exec(repo)
  if (sftp && !sftp[1].includes('/')) return { kind: 'sftp', host: sftp[1], path: sftp[2] || '.' }
  return { kind: 'other' }
}

/**
 * The SFTP client's `df <path>` output (1 KiB units: Size Used Avail (root)
 * %Capacity) → total and free bytes. A server that reports a size of 0 has no
 * limit to tell; that, like unreadable output, gives null.
 * @returns {{ totalBytes: number, freeBytes: number } | null}
 */
export function parseSftpDf(text) {
  for (const line of String(text).split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+%\s*$/.exec(line)
    if (!m) continue
    const [totalBytes, freeBytes] = [Number(m[1]) * 1024, Number(m[3]) * 1024]
    if (!Number.isSafeInteger(totalBytes) || !Number.isSafeInteger(freeBytes) || totalBytes === 0) return null
    return { totalBytes, freeBytes }
  }
  return null
}

/**
 * `restic diff --json older newer` → true when the newer backup holds the same
 * content: no file added, removed or changed. Only file times differ then
 * (the database is copied fresh every night), which isn't a change (S9.3).
 * @returns {boolean}
 */
export function parseDiffUnchanged(text) {
  const stats = String(text)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
    .find((m) => m?.message_type === 'statistics')
  if (!stats || !Number.isSafeInteger(stats.changed_files) || !stats.added || !stats.removed) {
    throw new Error('restic diff: no statistics')
  }
  const none = (side) => side.files === 0 && side.dirs === 0 && side.others === 0
  return stats.changed_files === 0 && none(stats.added) && none(stats.removed)
}

/** The pairs to compare: each snapshot with the next older one (list is newest first). */
export function neighbourPairs(snapshots) {
  return snapshots.slice(0, -1).map((s, i) => ({ newer: s.id, older: snapshots[i + 1].id }))
}

/**
 * Remembers which neighbours have the same content and fills in the missing
 * comparisons one at a time. Snapshots never change, so a result stays true;
 * the cache only grows by the pairs still in the list.
 * @param {{ diff: (older: string, newer: string) => Promise<boolean>, load: () => Promise<Record<string, boolean>>, save: (cache: Record<string, boolean>) => Promise<void>, log: (msg: string) => void }} deps
 */
export function makeComparer({ diff, load, save, log }) {
  /** @type {Record<string, boolean> | null} */
  let cache = null
  /** @type {Promise<void>} */
  let queue = Promise.resolve()
  const key = (p) => `${p.older}..${p.newer}`
  const ready = async () => {
    if (!cache) cache = await load().catch(() => ({}))
    return cache
  }
  /**
   * Annotate the list; missing comparisons are started and awaited for at most
   * `waitMs`, then keep running for the next visit.
   * @param {Snapshot[]} snapshots newest first
   */
  return async (snapshots, waitMs = 8000) => {
    const known = await ready()
    const pairs = neighbourPairs(snapshots)
    const missing = pairs.filter((p) => !(key(p) in known))
    if (missing.length) {
      queue = queue.then(async () => {
        for (const p of missing) {
          if (key(p) in known) continue
          try {
            known[key(p)] = await diff(p.older, p.newer)
          } catch (err) {
            log(`comparing ${p.older} with ${p.newer} failed: ${err instanceof Error ? err.message : String(err)}`)
          }
        }
        const keep = new Set(pairs.map(key))
        for (const k of Object.keys(known)) if (!keep.has(k)) delete known[k]
        await save(known).catch((err) => log(`saving comparisons failed: ${err.message}`))
      })
      await Promise.race([queue, new Promise((r) => setTimeout(r, waitMs).unref?.())])
    }
    const byNewer = new Map(pairs.map((p) => [p.newer, known[key(p)] ?? null]))
    return snapshots.map((s) => ({ ...s, unchanged: byNewer.get(s.id) ?? null }))
  }
}

/**
 * The scheduler's last-run file → `{ status, at, by }`, or `null` when there is
 * no (readable) record yet, e.g. right after the container started.
 * @returns {LastRun | null}
 */
export function parseLastRun(text) {
  let v
  try {
    v = JSON.parse(text)
  } catch {
    return null
  }
  if (!v || (v.status !== 'ok' && v.status !== 'failed') || !isIsoTime(v.at)) return null
  return { status: v.status, at: new Date(v.at).toISOString(), by: cleanBy(v.by) }
}

/**
 * The lock's info file → `{ startedAt, by }`. A lock without readable info
 * (it is being written right now) still means "running".
 * @returns {Running}
 */
export function parseRunning(text, fallbackStartedAt) {
  let v = null
  try {
    v = JSON.parse(text)
  } catch {}
  return {
    startedAt: v && isIsoTime(v.startedAt) ? new Date(v.startedAt).toISOString() : fallbackStartedAt,
    by: cleanBy(v?.by),
    kind: v?.kind === 'restore' ? 'restore' : 'backup',
    snapshot: isSnapshotId(v?.snapshot) ? v.snapshot : null,
  }
}

const isSnapshotId = (v) => typeof v === 'string' && /^[0-9a-f]{8,64}$/.test(v)

/**
 * The last-restore file (written by `msb-backup restore-live`) → record, or
 * `null` when there is none (readable).
 * @returns {LastRestore | null}
 */
export function parseLastRestore(text) {
  let v
  try {
    v = JSON.parse(text)
  } catch {
    return null
  }
  if (!v || (v.status !== 'ok' && v.status !== 'failed') || !isIsoTime(v.at) || !isSnapshotId(v.snapshot)) return null
  return {
    status: v.status,
    at: new Date(v.at).toISOString(),
    by: cleanBy(v.by),
    source: v.source === 'upload' ? 'upload' : 'backup',
    snapshot: v.snapshot,
    safety: isSnapshotId(v.safety) ? v.safety : null,
    code: RESTORE_CODES.includes(v.code) ? v.code : 'unknown',
    message: typeof v.message === 'string' ? v.message.slice(0, 300) : '',
  }
}

/**
 * `msb-backup inspect` output → the restore preview. Throws on anything else.
 * @returns {Preview}
 */
export function parsePreview(text) {
  const v = JSON.parse(text)
  const contents = (c) => {
    if (!c || typeof c !== 'object' || !Number.isSafeInteger(c.mediaFiles)) throw new Error('inspect: bad contents')
    const counts = {}
    for (const t of ['pages', 'blog', 'events', 'media', 'users']) {
      counts[t] = Number.isSafeInteger(c.counts?.[t]) ? c.counts[t] : null
    }
    return { counts, mediaFiles: c.mediaFiles }
  }
  if (!v || (v.integrity !== 'ok' && v.integrity !== 'damaged') || typeof v.compatible !== 'boolean') {
    throw new Error('inspect: unexpected output')
  }
  // Tables whose structure differs from the live database (empty when compatible).
  const differences = Array.isArray(v.differences)
    ? v.differences.filter((t) => typeof t === 'string' && /^[A-Za-z0-9_]+$/.test(t)).slice(0, 10)
    : []
  return {
    integrity: v.integrity,
    compatible: v.compatible,
    differences,
    backup: contents(v.backup),
    live: contents(v.live),
  }
}

/** Download name: what it is, when (UTC, sortable) and which snapshot. */
export function downloadName(snapshot) {
  const stamp = snapshot.time.slice(0, 16).replace(/[-:]/g, '')
  return `msb-backup-${stamp}Z-${snapshot.shortId}.tar.gz.enc`
}

/** PBKDF2 rounds for downloads; the decrypt command must name the same number. */
export const PBKDF2_ITERATIONS = 600_000

/** A passphrase the CMS generated: long enough to be one, printable ASCII only. */
export function validPassphrase(v) {
  return typeof v === 'string' && v.length >= 20 && v.length <= 200 && /^[\x21-\x7e]+$/.test(v)
}

/**
 * Encrypt a stream in OpenSSL's `enc` format: "Salted__", 8 random salt bytes,
 * then AES-256-CBC with key and IV from PBKDF2-SHA256(passphrase, salt).
 * Same as `openssl enc -aes-256-cbc -pbkdf2 -iter N -md sha256`.
 * @returns {Promise<import('node:stream').Readable>}
 */
export async function encryptStream(source, passphrase, iterations = PBKDF2_ITERATIONS) {
  const salt = randomBytes(8)
  const derived = await new Promise((resolve, reject) =>
    pbkdf2(passphrase, salt, iterations, 48, 'sha256', (err, key) => (err ? reject(err) : resolve(key))),
  )
  const cipher = createCipheriv('aes-256-cbc', derived.subarray(0, 32), derived.subarray(32, 48))
  const out = new PassThrough()
  out.write(Buffer.concat([Buffer.from('Salted__'), salt]))
  pipeline(source, cipher, out, (err) => {
    if (err) out.destroy(err)
  })
  return out
}

const deriveKey = (passphrase, salt, iterations) =>
  new Promise((resolve, reject) =>
    pbkdf2(passphrase, salt, iterations, 48, 'sha256', (err, key) => (err ? reject(err) : resolve(key))),
  )

/**
 * Decrypt a file written by `encryptStream` (OpenSSL `enc` format) to `dst`.
 * 'not-a-backup': no OpenSSL header; 'wrong-password': the padding at the end
 * doesn't check out, which is what a wrong password (or a damaged file) gives.
 * `dst` is removed unless the result is 'ok'.
 * @returns {Promise<'ok' | 'not-a-backup' | 'wrong-password'>}
 */
export async function decryptFile(src, dst, passphrase, iterations = PBKDF2_ITERATIONS) {
  const fh = await open(src, 'r')
  const head = Buffer.alloc(16)
  try {
    await fh.read(head, 0, 16, 0)
  } finally {
    await fh.close()
  }
  if (head.subarray(0, 8).toString('latin1') !== 'Salted__') return 'not-a-backup'
  const key = await deriveKey(passphrase, head.subarray(8, 16), iterations)
  const decipher = createDecipheriv('aes-256-cbc', key.subarray(0, 32), key.subarray(32, 48))
  try {
    await pipelineAsync(createReadStream(src, { start: 16 }), decipher, createWriteStream(dst))
    return 'ok'
  } catch (err) {
    await rm(dst, { force: true })
    if (err && /bad decrypt|wrong final block length/i.test(String(err.message))) return 'wrong-password'
    throw err
  }
}

/** Constant-time token check; hashing first makes the lengths equal. */
export function tokenMatches(given, expected) {
  if (typeof given !== 'string' || !expected) return false
  const h = (s) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(given), h(expected))
}

/** Read a small JSON request body; anything over 4 KB or not JSON is `null`. */
async function readJsonBody(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > 4096) return null
    chunks.push(chunk)
  }
  if (!size) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return null
  }
}

/**
 * The request handler, with its side effects passed in (tests fake them).
 * @param {{
 *   token: string,
 *   listSnapshots: () => Promise<Snapshot[]>,
 *   readStorage?: () => Promise<Storage>,
 *   compare?: (snapshots: Snapshot[]) => Promise<(Snapshot & { unchanged: boolean | null })[]>,
 *   readLastRun: () => Promise<LastRun | null>,
 *   readRunning: () => Promise<Running | null>,
 *   startBackup: (by: string | null) => 'started' | 'running',
 *   dumpSnapshot: (id: string) => { stream: import('node:stream').Readable, cancel: () => void },
 *   readLastRestore: () => Promise<LastRestore | null>,
 *   inspectSnapshot: (id: string) => Promise<Preview>,
 *   startRestore: (id: string, by: string | null) => 'started' | 'running',
 *   uploads?: {
 *     receive: (body: import('node:stream').Readable) => Promise<{ uploadId: string } | { tooLarge: true }>,
 *     check: (id: string, passphrase: string) => Promise<{ kind: 'ok', preview: Preview } | { kind: 'not-found' | 'wrong-password' | 'not-a-backup' }>,
 *     ready: (id: string) => Promise<boolean>,
 *     restore: (id: string, by: string | null) => 'started' | 'running',
 *     discard: (id: string) => Promise<void>,
 *   },
 *   log: (msg: string) => void,
 * }} deps
 */
export function makeHandler({
  token,
  listSnapshots,
  readStorage = async () => null,
  compare = async (snapshots) => snapshots.map((s) => ({ ...s, unchanged: null })),
  readLastRun,
  readRunning,
  startBackup,
  dumpSnapshot,
  readLastRestore,
  inspectSnapshot,
  startRestore,
  uploads,
  log,
}) {
  return async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    if (!tokenMatches(req.headers['x-backup-token'], token)) return send(401, { error: 'unauthorized' })
    const path = new URL(req.url ?? '/', 'http://backup').pathname

    try {
      if (req.method === 'GET' && path === '/backups') {
        // The storage figures are extra: when they can't be read, the list still shows.
        const storage = readStorage().catch((err) => {
          log(`storage figures failed: ${err instanceof Error ? err.message : String(err)}`)
          return null
        })
        const [snapshots, lastRun, running, lastRestore] = await Promise.all([
          listSnapshots(),
          readLastRun(),
          readRunning(),
          readLastRestore(),
        ])
        return send(200, { snapshots: await compare(snapshots), lastRun, running, lastRestore, storage: await storage })
      }
      if (req.method === 'GET' && path === '/status') {
        const [lastRun, running, lastRestore] = await Promise.all([readLastRun(), readRunning(), readLastRestore()])
        return send(200, { lastRun, running, lastRestore })
      }
      const findSnapshot = async (id) => (await listSnapshots()).find((s) => s.id === id || s.shortId === id)
      const preview = /^\/backups\/([0-9a-f]{8,64})\/preview$/.exec(path)
      if (req.method === 'GET' && preview) {
        const snapshot = await findSnapshot(preview[1])
        if (!snapshot) return send(404, { error: 'no such backup' })
        return send(200, { snapshot, ...(await inspectSnapshot(snapshot.id)) })
      }
      const restore = /^\/backups\/([0-9a-f]{8,64})\/restore$/.exec(path)
      if (req.method === 'POST' && restore) {
        const body = await readJsonBody(req)
        if (body === null) return send(400, { error: 'expected a small JSON body' })
        const snapshot = await findSnapshot(restore[1])
        if (!snapshot) return send(404, { error: 'no such backup' })
        // The deliberate confirmation: the caller must name the backup it means.
        if (body.confirm !== snapshot.shortId) return send(400, { error: 'confirm must be the backup short id' })
        const by = cleanBy(body.by)
        const running = await readRunning()
        if (running || startRestore(snapshot.id, by) === 'running') {
          return send(409, {
            error: 'a backup or restore is already running',
            running: running ?? (await readRunning()),
          })
        }
        log(`restore of ${snapshot.shortId} started by ${by ?? 'unknown'}`)
        return send(202, { started: true })
      }
      if (uploads && req.method === 'POST' && path === '/uploads') {
        if (await readRunning()) return send(409, { error: 'a backup or restore is running' })
        const out = await uploads.receive(req)
        if ('tooLarge' in out) return send(413, { error: 'file too large' })
        log(`backup file uploaded as ${out.uploadId}`)
        return send(201, out)
      }
      const upload = /^\/uploads\/([0-9a-f]{8})(\/check|\/restore)?$/.exec(path)
      if (uploads && upload) {
        const [, uploadId, action] = upload
        if (req.method === 'DELETE' && !action) {
          await uploads.discard(uploadId)
          res.writeHead(204).end()
          return
        }
        if (req.method === 'POST' && action === '/check') {
          const body = await readJsonBody(req)
          if (body === null || !validPassphrase(body.passphrase)) return send(400, { error: 'expected { passphrase }' })
          const out = await uploads.check(uploadId, body.passphrase)
          if (out.kind === 'not-found') return send(404, { error: 'no such upload' })
          if (out.kind !== 'ok') return send(422, { code: out.kind })
          return send(200, { uploadId, ...out.preview })
        }
        if (req.method === 'POST' && action === '/restore') {
          const body = await readJsonBody(req)
          if (body === null) return send(400, { error: 'expected a small JSON body' })
          if (!(await uploads.ready(uploadId))) return send(404, { error: 'no checked upload' })
          if (body.confirm !== uploadId) return send(400, { error: 'confirm must be the upload id' })
          const by = cleanBy(body.by)
          const running = await readRunning()
          if (running || uploads.restore(uploadId, by) === 'running') {
            return send(409, {
              error: 'a backup or restore is already running',
              running: running ?? (await readRunning()),
            })
          }
          log(`restore of uploaded backup ${uploadId} started by ${by ?? 'unknown'}`)
          return send(202, { started: true })
        }
      }
      const download = /^\/backups\/([0-9a-f]{8,64})\/download$/.exec(path)
      if (req.method === 'POST' && download) {
        const body = await readJsonBody(req)
        if (body === null || !validPassphrase(body.passphrase)) {
          return send(400, { error: 'expected { passphrase } of 20 to 200 printable characters' })
        }
        const snapshot = (await listSnapshots()).find((s) => s.id === download[1] || s.shortId === download[1])
        if (!snapshot) return send(404, { error: 'no such backup' })
        const by = cleanBy(body.by)
        log(`backup ${snapshot.shortId} downloaded (encrypted) by ${by ?? 'unknown'}`)
        const { stream, cancel } = dumpSnapshot(snapshot.id)
        const encrypted = await encryptStream(stream, body.passphrase)
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${downloadName(snapshot)}"`,
          'Cache-Control': 'no-store',
        })
        // A cancelled download stops restic instead of reading the whole repository for nobody.
        res.on('close', () => {
          if (!res.writableFinished) cancel()
        })
        pipeline(encrypted, res, (err) => {
          if (err) log(`download of ${snapshot.shortId} broke off: ${err.message}`)
        })
        return
      }
      if (req.method === 'POST' && path === '/backups') {
        const body = await readJsonBody(req)
        if (body === null) return send(400, { error: 'expected a small JSON body' })
        const by = cleanBy(body.by)
        const running = await readRunning()
        if (running || startBackup(by) === 'running') {
          return send(409, { error: 'a backup is already running', running: running ?? (await readRunning()) })
        }
        log(`backup started by ${by ?? 'unknown'}`)
        return send(202, { started: true })
      }
    } catch (err) {
      log(`${req.method} ${path} failed: ${err instanceof Error ? err.message : String(err)}`)
      return send(502, { error: 'the backup service failed, see its log' })
    }
    return send(404, { error: 'not found' })
  }
}

const execFileAsync = promisify(execFile)

async function main() {
  const log = (msg) => console.log(`${new Date().toISOString()} [backup-api] ${msg}`)
  const token = process.env.BACKUP_API_TOKEN ?? ''
  const port = Number(process.env.BACKUP_API_PORT || 8081)
  const statusFile = process.env.BACKUP_STATUS_FILE || '/work/last-run.json'
  const lockDir = process.env.BACKUP_LOCK_DIR || '/work/backup.lock'
  if (!token) {
    console.error('[backup-api] BACKUP_API_TOKEN is not set; refusing to start')
    process.exit(1)
  }

  const readOptional = async (file) => {
    try {
      return await readFile(file, 'utf8')
    } catch (err) {
      if (err && err.code === 'ENOENT') return null
      throw err
    }
  }

  const listSnapshots = async () => {
    // --no-lock: a read-only listing must not wait for (or block) a running backup.
    const { stdout } = await execFileAsync(
      'restic',
      ['snapshots', '--json', '--no-lock', '--host', 'msb-homepage', '--tag', 'msb'],
      { timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
    )
    return parseSnapshots(JSON.parse(stdout))
  }
  const diffCache = process.env.BACKUP_DIFF_CACHE || '/work/diffs.json'
  const compare = makeComparer({
    diff: async (older, newer) => {
      const { stdout } = await execFileAsync('restic', ['diff', '--json', '--no-lock', older, newer], {
        timeout: 120_000,
        maxBuffer: 64 * 1024 * 1024,
      })
      return parseDiffUnchanged(stdout)
    },
    load: async () => {
      const text = await readOptional(diffCache)
      const parsed = text === null ? {} : JSON.parse(text)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'boolean'))
        : {}
    },
    save: async (cache) => {
      const tmp = `${diffCache}.tmp`
      await writeFile(tmp, JSON.stringify(cache))
      await rename(tmp, diffCache)
    },
    log,
  })
  const readStorage = async () => {
    const [stats, space] = await Promise.all([
      execFileAsync('restic', ['stats', '--mode', 'raw-data', '--json', '--no-lock'], {
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      }).then(({ stdout }) => parseRepoUsed(JSON.parse(stdout))),
      readFreeSpace(repoLocation(process.env.RESTIC_REPOSITORY)),
    ])
    return { usedBytes: stats, totalBytes: space?.totalBytes ?? null, freeBytes: space?.freeBytes ?? null }
  }
  /** @returns {Promise<{ totalBytes: number, freeBytes: number } | null>} */
  const readFreeSpace = async (where) => {
    if (where.kind === 'local') {
      const fs = await statfs(where.path)
      return { totalBytes: fs.blocks * fs.bsize, freeBytes: fs.bavail * fs.bsize }
    }
    if (where.kind === 'sftp') {
      // Same ssh setup as restic's sftp backend (~/.ssh config, key, known_hosts).
      const { stdout } = await runWithInput('sftp', ['-q', '-b', '-', where.host], `df ${where.path}\n`, 30_000)
      return parseSftpDf(stdout)
    }
    return null
  }
  const runWithInput = (cmd, args, input, timeout) =>
    new Promise((resolve, reject) => {
      const proc = execFile(cmd, args, { timeout, maxBuffer: 1024 * 1024 }, (err, stdout) =>
        err ? reject(err) : resolve({ stdout }),
      )
      proc.stdin?.end(input)
    })
  const readLastRun = async () => {
    const text = await readOptional(statusFile)
    return text === null ? null : parseLastRun(text)
  }

  const restoreFile = process.env.RESTORE_STATUS_FILE || '/work/last-restore.json'
  const readLastRestore = async () => {
    const text = await readOptional(restoreFile)
    return text === null ? null : parseLastRestore(text)
  }
  const inspectSnapshot = async (id) => {
    const { stdout } = await execFileAsync('msb-backup', ['inspect', id], { timeout: 300_000, maxBuffer: 1024 * 1024 })
    return parsePreview(stdout)
  }

  // A backup or restore we started and that hasn't exited yet; covers the
  // moment before msb-backup has taken its lock. One at a time.
  /** @type {Running | null} */
  let child = null
  const run = (args, by, running) => {
    if (child) return 'running'
    child = running
    const proc = spawn('msb-backup', args, {
      env: { ...process.env, BACKUP_BY: by ?? '' },
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    proc.on('exit', (code) => {
      log(`${args.join(' ')} (by ${by ?? 'unknown'}) exited with ${code}`)
      child = null
    })
    proc.on('error', (err) => {
      log(`could not run msb-backup ${args[0]}: ${err.message}`)
      child = null
    })
    return 'started'
  }
  const readRunning = async () => {
    const pidText = await readOptional(`${lockDir}/pid`)
    const pid = Number(pidText)
    const lockHeld = pidText !== null && Number.isInteger(pid) && pid > 0 && isAlive(pid)
    if (lockHeld) return parseRunning((await readOptional(`${lockDir}/info.json`)) ?? '', new Date().toISOString())
    return child
  }
  const startBackup = (by) =>
    run(['backup'], by, { startedAt: new Date().toISOString(), by, kind: 'backup', snapshot: null })
  const startRestore = (id, by) =>
    run(['restore-live', id], by, { startedAt: new Date().toISOString(), by, kind: 'restore', snapshot: id })

  // Uploaded backups (S8.4): one file at a time in $UPLOAD_DIR, used for one restore.
  const uploadDir = process.env.UPLOAD_DIR || '/work/uploads'
  const maxUpload = Number(process.env.BACKUP_UPLOAD_MAX_BYTES || 20 * 1024 ** 3)
  const uploads = {
    receive: async (body) => {
      await rm(uploadDir, { recursive: true, force: true }) // an earlier, unused upload goes
      await mkdir(uploadDir, { recursive: true })
      const uploadId = randomBytes(4).toString('hex')
      const file = `${uploadDir}/${uploadId}.enc`
      let size = 0
      let tooLarge = false
      const counter = new PassThrough()
      counter.on('data', (chunk) => {
        size += chunk.length
        if (size > maxUpload) {
          tooLarge = true
          counter.destroy(new Error('too large'))
        }
      })
      try {
        await pipelineAsync(body, counter, createWriteStream(file))
      } catch (err) {
        await rm(file, { force: true })
        if (tooLarge) return { tooLarge: true }
        throw err
      }
      return { uploadId }
    },
    check: async (id, passphrase) => {
      const enc = `${uploadDir}/${id}.enc`
      if (!(await stat(enc).catch(() => null))) return { kind: 'not-found' }
      const decrypted = await decryptFile(enc, `${uploadDir}/${id}.tar.gz`, passphrase)
      if (decrypted === 'not-a-backup') {
        await rm(enc, { force: true })
        return { kind: 'not-a-backup' }
      }
      if (decrypted === 'wrong-password') return { kind: 'wrong-password' } // keep the file: try again
      try {
        const { stdout } = await execFileAsync('msb-backup', ['stage-upload', id], {
          timeout: 30 * 60_000,
          maxBuffer: 1024 * 1024,
        })
        await rm(enc, { force: true })
        return { kind: 'ok', preview: parsePreview(stdout) }
      } catch (err) {
        // 3: no readable .tar.gz inside (wrong password that happened to pad right, or a damaged file); 4: not ours.
        if (err && err.code === 3) return { kind: 'wrong-password' }
        if (err && err.code === 4) {
          await rm(enc, { force: true })
          return { kind: 'not-a-backup' }
        }
        throw err
      }
    },
    ready: async (id) => Boolean(await stat(`${uploadDir}/${id}`).catch(() => null)),
    restore: (id, by) =>
      run(['restore-upload', id], by, { startedAt: new Date().toISOString(), by, kind: 'restore', snapshot: id }),
    discard: async (id) => {
      for (const f of [`${id}.enc`, `${id}.tar.gz`, `${id}.tar.gz.list`, id]) {
        await rm(`${uploadDir}/${f}`, { recursive: true, force: true })
      }
    },
  }

  // restic writes the snapshot as a tar stream (paths as backed up: /work/db/msb.db,
  // /volumes/media/…); gzip makes the database part small.
  const dumpSnapshot = (id) => {
    const proc = spawn('restic', ['dump', '--archive', 'tar', id, '/'], { stdio: ['ignore', 'pipe', 'pipe'] })
    proc.stderr.on('data', (d) => log(`restic dump: ${String(d).trim()}`))
    const gzip = createGzip()
    proc.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') gzip.destroy(new Error(`restic dump exited with ${code ?? signal}`))
    })
    return {
      stream: proc.stdout.pipe(gzip),
      cancel: () => proc.kill('SIGTERM'),
    }
  }

  const server = createServer(
    makeHandler({
      token,
      listSnapshots,
      readStorage,
      compare,
      readLastRun,
      readRunning,
      startBackup,
      dumpSnapshot,
      readLastRestore,
      inspectSnapshot,
      startRestore,
      uploads,
      log,
    }),
  )
  // Node counts receiving the whole request against this: an upload (S8.4) may take long.
  server.requestTimeout = 2 * 60 * 60_000
  server.listen(port, () => log(`listening on :${port}`))
  const stop = () => server.close(() => process.exit(0))
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
  process.on('unhandledRejection', (err) => {
    log(`unhandled rejection: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
}

/** Signal 0 only checks that the process exists (and we may signal it). */
function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err && err.code === 'EPERM'
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
