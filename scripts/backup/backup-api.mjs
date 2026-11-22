#!/usr/bin/env node
// backup-api — the backup container's internal HTTP API (E8; S8.1 lists backups).
//
// Runs next to the nightly scheduler in the `backup` service (started by
// `msb-backup schedule`). Only the CMS calls it, over the internal compose
// network and only after checking that the user is an admin, so the restic
// password never leaves this container. There is deliberately no way to
// delete or prune backups through it.
//
//   GET /backups   → { snapshots: [{ id, shortId, time, sizeBytes }], lastRun }
//
// Auth: header `X-Backup-Token` must equal BACKUP_API_TOKEN (compared in
// constant time); without the token the API refuses to start.
// Env: BACKUP_API_TOKEN (required), BACKUP_API_PORT (default 8081),
//      BACKUP_STATUS_FILE (default /work/last-run.json, written by msb-backup).
// Plain JS without dependencies: the backup image has Node but no node_modules.

import { execFile } from 'node:child_process'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'

/** @typedef {{ id: string, shortId: string, time: string, sizeBytes: number | null }} Snapshot */
/** @typedef {{ status: 'ok' | 'failed', at: string }} LastRun */

const isIsoTime = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

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
 * The scheduler's last-run file → `{ status, at }`, or `null` when there is no
 * (readable) record yet, e.g. right after the container started.
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
  return { status: v.status, at: new Date(v.at).toISOString() }
}

/** Constant-time token check; hashing first makes the lengths equal. */
export function tokenMatches(given, expected) {
  if (typeof given !== 'string' || !expected) return false
  const h = (s) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(given), h(expected))
}

/**
 * The request handler, with its side effects passed in (tests fake them).
 * @param {{ token: string, listSnapshots: () => Promise<Snapshot[]>, readLastRun: () => Promise<LastRun | null>, log: (msg: string) => void }} deps
 */
export function makeHandler({ token, listSnapshots, readLastRun, log }) {
  return async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    if (!tokenMatches(req.headers['x-backup-token'], token)) return send(401, { error: 'unauthorized' })
    const path = new URL(req.url ?? '/', 'http://backup').pathname
    if (req.method === 'GET' && path === '/backups') {
      try {
        const [snapshots, lastRun] = await Promise.all([listSnapshots(), readLastRun()])
        return send(200, { snapshots, lastRun })
      } catch (err) {
        log(`listing backups failed: ${err instanceof Error ? err.message : String(err)}`)
        return send(502, { error: 'listing backups failed, see the backup container log' })
      }
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
  if (!token) {
    console.error('[backup-api] BACKUP_API_TOKEN is not set; refusing to start')
    process.exit(1)
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
    try {
      return parseLastRun(await readFile(statusFile, 'utf8'))
    } catch (err) {
      if (err && err.code === 'ENOENT') return null
      throw err
    }
  }

  const server = createServer(makeHandler({ token, listSnapshots, readLastRun, log }))
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

if (import.meta.url === `file://${process.argv[1]}`) await main()
