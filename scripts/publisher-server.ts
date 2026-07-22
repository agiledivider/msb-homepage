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
/** Push to the registry. Off for local end-to-end runs so a test can't ship. */
const PUSH_IMAGE = process.env.PUSH_IMAGE !== 'false'
/** Optional: serve the result from a local nginx via these shared volumes. */
const SITE_HTML_DIR = process.env.SITE_HTML_DIR || ''
const SITE_CONF_DIR = process.env.SITE_CONF_DIR || ''
/** Quiet period before an auto-triggered publish runs, so a burst of edits = one build. */
const DEBOUNCE_MS = Number(process.env.PUBLISH_DEBOUNCE_MS || 5 * 60_000)
/** Nightly run, Berlin local time (the container's TZ). */
const NIGHTLY_HOUR = Number(process.env.PUBLISH_NIGHTLY_HOUR ?? 3)
const STATE_FILE = process.env.PUBLISH_STATE_FILE || '/tmp/publish-state.json'

/**
 * The full pipeline, in order. The publisher owns this list (not
 * publish-static.ts) because it brackets the snapshot with its own steps —
 * the database copy before, the sync and registry push after. Labels are German
 * to match the admin UI.
 */
/**
 * `weight` is roughly the share of wall-clock each stage takes (measured on a
 * real run). Equal weighting made the progress bar sit at 10% for the ~45s Next
 * build and then leap forward — which reads as a hang. The build and the image
 * ladder genuinely dominate, so the bar should reflect that.
 */
const STAGES: Array<{ key: string; label: string; weight: number }> = [
  { key: 'db', label: 'Datenbank-Schnappschuss', weight: 1 },
  { key: 'build', label: 'Next.js-Build', weight: 30 },
  { key: 'server', label: 'Server starten', weight: 2 },
  { key: 'crawl', label: 'Seiten erfassen', weight: 25 },
  { key: 'assets', label: 'Assets kopieren', weight: 3 },
  { key: 'images', label: 'Bilder konvertieren', weight: 30 },
  { key: 'seo', label: 'Sitemap & robots.txt', weight: 1 },
  { key: 'configs', label: 'Host-Konfiguration', weight: 1 },
  { key: 'sync', label: 'Website aktualisieren', weight: 4 },
  { key: 'push', label: 'Image hochladen', weight: 3 },
]
const TOTAL_WEIGHT = STAGES.reduce((n, s) => n + s.weight, 0)

type Progress = {
  stage: string
  label: string
  step: number
  steps: number
  current?: number
  total?: number
  /** Sub-step within the stage, e.g. which phase of the Next build. */
  detail?: string
  /** Weighted completion 0–1, computed here so the UI needn't know the weights. */
  fraction: number
}

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

const state: {
  phase: Phase
  startedAt?: string
  reason?: string
  /** A debounced auto-publish waiting to fire. */
  pending?: { reason: string; dueAt: string }
  /** What the running publish is doing right now. */
  progress?: Progress
  last?: Result
} = { phase: 'idle' }

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

/**
 * Copy the snapshot into the volumes a co-located nginx serves.
 *
 * Deliberately a copy rather than mounting the volume at `dist/`: the pipeline
 * wipes `dist/` on every run, and unlinking a mount point fails with EBUSY.
 * Stale files are cleared first so deleted pages actually disappear.
 */
async function syncToLocalNginx(): Promise<string | null> {
  if (!SITE_HTML_DIR) return null
  const sh = (cmd: string) => execFileAsync('sh', ['-c', cmd])
  await sh(`rm -rf ${SITE_HTML_DIR}/* ${SITE_HTML_DIR}/.[!.]* 2>/dev/null; true`)
  await sh(`cp -a ${path.join(ROOT, 'dist')}/. ${SITE_HTML_DIR}/`)
  if (SITE_CONF_DIR) {
    await mkdir(SITE_CONF_DIR, { recursive: true })
    await copyFile(path.join(ROOT, 'nginx.conf'), path.join(SITE_CONF_DIR, 'default.conf'))
  }
  return SITE_HTML_DIR
}

async function runPublish(reason: string): Promise<Result> {
  const started = Date.now()
  state.phase = 'running'
  state.startedAt = new Date().toISOString()
  state.reason = reason
  state.progress = undefined
  await saveState()
  log(`publish started (${reason})`)

  /** Record the current stage so /status (and the admin widget) can show it. */
  const setStage = (stage: string, current?: number, total?: number, detail?: string) => {
    const i = STAGES.findIndex((s) => s.key === stage)
    const before = STAGES.slice(0, Math.max(0, i)).reduce((n, s) => n + s.weight, 0)
    const within = total ? Math.min(1, (current ?? 0) / total) : 0
    state.progress = {
      stage,
      label: STAGES[i]?.label ?? stage,
      step: i + 1,
      steps: STAGES.length,
      current,
      total,
      detail,
      fraction: Math.min(1, (before + (STAGES[i]?.weight ?? 0) * within) / TOTAL_WEIGHT),
    }
  }

  try {
    // Snapshot the DB first: the live container keeps serving and editors keep
    // saving while we build, and SQLite can't be safely read mid-write.
    //
    // The -wal/-shm sidecars must come along: in WAL mode the newest commits
    // live in the write-ahead log, so copying only the .db silently publishes
    // stale content. Opening the copy replays the WAL.
    setStage('db')
    await copyFile(SOURCE_DB, BUILD_DB)
    for (const suffix of ['-wal', '-shm']) {
      await copyFile(`${SOURCE_DB}${suffix}`, `${BUILD_DB}${suffix}`).catch(() => {
        // absent when the DB isn't in WAL mode, or nothing is pending — fine
      })
    }
    process.env.DATABASE_URI = `file:${BUILD_DB}`

    const { ok, total } = await publishStatic((p) => setStage(p.stage, p.current, p.total, p.detail))

    setStage('sync')
    const served = await syncToLocalNginx()
    if (served) log(`synced snapshot → ${served}`)

    setStage('push')
    const sha = (process.env.GIT_SHA || 'nogit').slice(0, 12)
    const image = PUSH_IMAGE
      ? await pushImage(`${sha}-${new Date().toISOString().slice(0, 10)}`)
      : 'not pushed (PUSH_IMAGE=false)'

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
    state.progress = undefined
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

/**
 * Auto-publish: wait for the edits to stop before spending a build.
 *
 * The pending run is recorded in `state` (not just a timer) so `/status` can
 * tell the admin a publish is coming — otherwise someone publishes a document,
 * sees "idle", and assumes nothing happened.
 */
function triggerDebounced(reason: string): string {
  if (debounceTimer) clearTimeout(debounceTimer)
  const dueAt = new Date(Date.now() + DEBOUNCE_MS).toISOString()
  state.pending = { reason, dueAt }
  log(`auto-publish queued (${reason}) — runs at ${dueAt} unless more changes arrive`)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    state.pending = undefined
    trigger(reason)
  }, DEBOUNCE_MS)
  void saveState()
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
    return send(200, {
      phase: state.phase,
      startedAt: state.startedAt,
      reason: state.reason,
      progress: state.progress,
      pending: state.pending,
      last: state.last,
    })
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
