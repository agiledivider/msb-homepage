#!/usr/bin/env node
// backup-api — the backup container's internal HTTP API (E8).
//
// Runs next to the nightly scheduler in the `backup` service (started by
// `msb-backup schedule`). Only the CMS calls it, over the internal compose
// network and only after checking that the user is an admin, so the restic
// password never leaves this container. There is deliberately no way to
// delete or prune backups through it (D-005).
//
//   GET  /backups  → { snapshots: [{ id, shortId, time, sizeBytes }], lastRun, running }   (S8.1)
//   GET  /status   → { lastRun, running }      cheap: no restic call, for polling
//   POST /backups  { by } → 202 { started: true }, or 409 { running } if one runs   (S8.5)
//
// lastRun: { status: 'ok'|'failed', at, by } (by: who started it, null = nightly)
// running: { startedAt, by } or null
//
// Auth: header `X-Backup-Token` must equal BACKUP_API_TOKEN (compared in
// constant time); without the token the API refuses to start.
// Env: BACKUP_API_TOKEN (required), BACKUP_API_PORT (default 8081),
//      BACKUP_STATUS_FILE (default /work/last-run.json, written by msb-backup),
//      BACKUP_LOCK_DIR (default /work/backup.lock, held by msb-backup while a backup runs).
// Plain JS without dependencies: the backup image has Node but no node_modules.

import { execFile, spawn } from 'node:child_process'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'

/** @typedef {{ id: string, shortId: string, time: string, sizeBytes: number | null }} Snapshot */
/** @typedef {{ status: 'ok' | 'failed', at: string, by: string | null }} LastRun */
/** @typedef {{ startedAt: string, by: string | null }} Running */

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
      }
    })
    .sort((a, b) => b.time.localeCompare(a.time))
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
 *   readLastRun: () => Promise<LastRun | null>,
 *   readRunning: () => Promise<Running | null>,
 *   startBackup: (by: string | null) => 'started' | 'running',
 *   log: (msg: string) => void,
 * }} deps
 */
export function makeHandler({ token, listSnapshots, readLastRun, readRunning, startBackup, log }) {
  return async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    if (!tokenMatches(req.headers['x-backup-token'], token)) return send(401, { error: 'unauthorized' })
    const path = new URL(req.url ?? '/', 'http://backup').pathname

    try {
      if (req.method === 'GET' && path === '/backups') {
        const [snapshots, lastRun, running] = await Promise.all([listSnapshots(), readLastRun(), readRunning()])
        return send(200, { snapshots, lastRun, running })
      }
      if (req.method === 'GET' && path === '/status') {
        const [lastRun, running] = await Promise.all([readLastRun(), readRunning()])
        return send(200, { lastRun, running })
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
  const readLastRun = async () => {
    const text = await readOptional(statusFile)
    return text === null ? null : parseLastRun(text)
  }

  // A backup we started and that hasn't exited yet; covers the moment before
  // msb-backup has taken its lock.
  /** @type {{ startedAt: string, by: string | null } | null} */
  let child = null
  const readRunning = async () => {
    const pidText = await readOptional(`${lockDir}/pid`)
    const pid = Number(pidText)
    const lockHeld = pidText !== null && Number.isInteger(pid) && pid > 0 && isAlive(pid)
    if (lockHeld) return parseRunning((await readOptional(`${lockDir}/info.json`)) ?? '', new Date().toISOString())
    return child
  }
  const startBackup = (by) => {
    if (child) return 'running'
    child = { startedAt: new Date().toISOString(), by }
    const proc = spawn('msb-backup', ['backup'], {
      env: { ...process.env, BACKUP_BY: by ?? '' },
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    const done = (code) => {
      log(`backup started by ${by ?? 'unknown'} exited with ${code}`)
      child = null
    }
    proc.on('exit', done)
    proc.on('error', (err) => {
      log(`could not start the backup: ${err.message}`)
      child = null
    })
    return 'started'
  }

  const server = createServer(makeHandler({ token, listSnapshots, readLastRun, readRunning, startBackup, log }))
  server.requestTimeout = 90_000
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
