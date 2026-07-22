/**
 * publisher-server.ts — the publish worker.
 *
 * Runs in its own container so a build never competes with the live Payload
 * admin (and never rewrites the `.next` that container is serving from). It:
 *
 *   1. copies the SQLite file out of the shared volume (a build must not read a
 *      database that is being written to, and a read-only WAL mount breaks
 *      SQLite outright),
 *   2. runs the snapshot pipeline from `publish-static.ts`,
 *   3. assembles + pushes the nginx image with `crane` — no Docker daemon, so
 *      this container never needs the host socket.
 *
 * Endpoints (internal network only; Payload proxies to them after checking RBAC):
 *   POST /publish   { reason }   → queue a run (single-flight, debounced)
 *   GET  /status                 → current state + last result, for the admin UI
 *
 * Auth: `X-Publish-Token` must match PUBLISH_TOKEN.
 */
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { promisify } from 'node:util'
import { publishStatic } from './publish-static.js'

const execFileAsync = promisify(execFile)

const ROOT = process.cwd()
const PORT = Number(process.env.PUBLISHER_PORT || 8080)
const TOKEN = process.env.PUBLISH_TOKEN || ''
/** SQLite file in the shared volume, written by the Payload container. */
const SOURCE_DB = process.env.SOURCE_DATABASE_FILE || '/data/msb.db'
/** Where the build reads from — a private copy, so edits mid-build can't tear it. */
const BUILD_DB = process.env.BUILD_DATABASE_FILE || '/tmp/publish.db'
const IMAGE = process.env.STATIC_IMAGE || 'ghcr.io/agiledivider/msb-demo'
const TAG = process.env.TAG || 'latest'
const PLATFORM = process.env.PLATFORM || 'linux/amd64'
const BASE_IMAGE = process.env.BASE_IMAGE || 'nginx:1.27-alpine'
/** Quiet period before an auto-triggered publish runs, so a burst of edits = one build. */
const DEBOUNCE_MS = Number(process.env.PUBLISH_DEBOUNCE_MS || 5 * 60_000)
/** Nightly run, Berlin local time (the container's TZ). */
const NIGHTLY_HOUR = Number(process.env.PUBLISH_NIGHTLY_HOUR ?? 3)
const STATE_FILE = process.env.PUBLISH_STATE_FILE || '/tmp/publish-state.json'

type Phase = 'idle' | 'queued' | 'running'
type Result = {
  at: string
  ok: boolean
  reason: string
  routes?: number
  image?: string
  error?: string
  durationMs: number
}

const state: { phase: Phase; startedAt?: string; reason?: string; last?: Result } = { phase: 'idle' }

/** Coalesces concurrent requests: while a run is in flight, another is queued at most once. */
let inFlight: Promise<void> | null = null
let pendingReason: string | null = null
let debounceTimer: NodeJS.Timeout | null = null

const log = (msg: string) => console.log(`[publisher] ${new Date().toISOString()} ${msg}`)

async function saveState() {
  await writeFile(STATE_FILE, JSON.stringify(state)).catch(() => {})
}
async function loadState() {
  try {
    const prev = JSON.parse(await readFile(STATE_FILE, 'utf8'))
    if (prev?.last) state.last = prev.last
  } catch {
    // no previous state — fine
  }
}

/**
 * Assemble and push the image without a Docker daemon.
 *
 * The static image is just `nginx:alpine` + files, so there is nothing a real
 * Dockerfile build would add — and `crane` needs no privileges, where mounting
 * the host's docker.sock into a web-triggerable container would hand it root.
 */
async function pushImage(sha: string): Promise<string> {
  const layer = '/tmp/site-layer.tar'
  const stage = '/tmp/stage'

  // Lay the files out at the paths they must occupy inside the image.
  await execFileAsync('rm', ['-rf', stage])
  await mkdir(path.join(stage, 'usr/share/nginx/html'), { recursive: true })
  await mkdir(path.join(stage, 'etc/nginx/conf.d'), { recursive: true })
  await execFileAsync('cp', ['-a', `${path.join(ROOT, 'dist')}/.`, path.join(stage, 'usr/share/nginx/html')])
  await copyFile(path.join(ROOT, 'nginx.conf'), path.join(stage, 'etc/nginx/conf.d/default.conf'))
  await execFileAsync('tar', ['-C', stage, '-cf', layer, '.'])

  const tags = [`${IMAGE}:${TAG}`, `${IMAGE}:${sha}`]
  await execFileAsync('crane', ['append', '--platform', PLATFORM, '-b', BASE_IMAGE, '-f', layer, '-t', tags[0]], {
    maxBuffer: 32 * 1024 * 1024,
  })
  // Same digest, second name — cheap, and gives us a rollback tag.
  await execFileAsync('crane', ['tag', tags[0], sha])
  return tags.join(', ')
}

async function runPublish(reason: string): Promise<Result> {
  const started = Date.now()
  state.phase = 'running'
  state.startedAt = new Date().toISOString()
  state.reason = reason
  await saveState()
  log(`publish started (${reason})`)

  try {
    // Snapshot the DB first: the live container keeps serving and editors keep
    // saving while we build, and SQLite can't be safely read mid-write.
    //
    // The -wal/-shm sidecars must come along: in WAL mode the newest commits
    // live in the write-ahead log, so copying only the .db silently publishes
    // stale content. Opening the copy replays the WAL.
    await copyFile(SOURCE_DB, BUILD_DB)
    for (const suffix of ['-wal', '-shm']) {
      await copyFile(`${SOURCE_DB}${suffix}`, `${BUILD_DB}${suffix}`).catch(() => {
        // absent when the DB isn't in WAL mode, or nothing is pending — fine
      })
    }
    process.env.DATABASE_URI = `file:${BUILD_DB}`

    const { ok, total } = await publishStatic()
    const sha = (process.env.GIT_SHA || 'nogit').slice(0, 12)
    const image = await pushImage(`${sha}-${new Date().toISOString().slice(0, 10)}`)

    const result: Result = {
      at: new Date().toISOString(),
      ok: true,
      reason,
      routes: ok,
      image,
      durationMs: Date.now() - started,
    }
    log(`publish ok — ${ok}/${total} routes → ${image}`)
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log(`publish FAILED: ${message}`)
    return { at: new Date().toISOString(), ok: false, reason, error: message, durationMs: Date.now() - started }
  }
}

/** Start a run, or fold the request into the one already in flight. */
function trigger(reason: string): { accepted: boolean; note: string } {
  if (inFlight) {
    pendingReason = pendingReason ? `${pendingReason}, ${reason}` : reason
    return { accepted: true, note: 'a publish is already running; queued a follow-up' }
  }

  state.phase = 'queued'
  inFlight = (async () => {
    state.last = await runPublish(reason)
    state.phase = 'idle'
    state.startedAt = undefined
    state.reason = undefined
    await saveState()
    inFlight = null
    if (pendingReason) {
      const next = pendingReason
      pendingReason = null
      trigger(next)
    }
  })()
  return { accepted: true, note: 'publish started' }
}

/** Auto-publish: wait for the edits to stop before spending a build. */
function triggerDebounced(reason: string): string {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    trigger(reason)
  }, DEBOUNCE_MS)
  return `queued; runs in ${Math.round(DEBOUNCE_MS / 1000)}s unless more changes arrive`
}

/** Fire once per day at NIGHTLY_HOUR local time. */
function scheduleNightly() {
  const tick = () => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(NIGHTLY_HOUR, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    const delay = next.getTime() - now.getTime()
    log(`next nightly publish at ${next.toISOString()}`)
    setTimeout(() => {
      trigger('nightly')
      tick()
    }, delay)
  }
  tick()
}

const server = createServer(async (req, res) => {
  const send = (code: number, body: unknown) => {
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  if (req.url === '/health') return send(200, { ok: true })

  if (TOKEN && req.headers['x-publish-token'] !== TOKEN) return send(401, { error: 'Unauthorized' })

  if (req.method === 'GET' && req.url === '/status') {
    return send(200, { phase: state.phase, startedAt: state.startedAt, reason: state.reason, last: state.last })
  }

  if (req.method === 'POST' && req.url?.startsWith('/publish')) {
    let body = ''
    for await (const chunk of req) body += chunk
    const { reason = 'manual', debounce = false } = (() => {
      try {
        return JSON.parse(body || '{}')
      } catch {
        return {}
      }
    })()
    const note = debounce ? triggerDebounced(reason) : trigger(reason).note
    return send(202, { accepted: true, note, phase: state.phase })
  }

  send(404, { error: 'Not found' })
})

await loadState()
scheduleNightly()
server.listen(PORT, () => log(`listening on :${PORT} — image ${IMAGE}:${TAG}, nightly at ${NIGHTLY_HOUR}:00`))
