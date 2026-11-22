import { z } from 'zod'
import { isCmsUser } from '@/access/admin'
import { isValidPassphrase } from './passphrase'

/**
 * Talking to the backup container for the admin backups view (E8). The backups
 * live in that container; it answers on the internal compose network only, and
 * only to the shared token (D-005). This module decides who may ask (admins)
 * and turns the answers into what the view shows.
 */

/** Warn when the newest backup is older than this: a day and a half, so one missed night shows. */
export const STALE_AFTER_MS = 36 * 60 * 60 * 1000

const SnapshotSchema = z.object({
  id: z.string().min(1),
  shortId: z.string().min(1),
  time: z.string().datetime(),
  /** null: restic didn't record a size (snapshots from before restic 0.17). */
  sizeBytes: z.number().int().nonnegative().nullable(),
})
const LastRunSchema = z.object({
  status: z.enum(['ok', 'failed']),
  at: z.string().datetime(),
  /** Who started it in the CMS; null = the nightly run. */
  by: z.string().nullable(),
})
const RunningSchema = z.object({ startedAt: z.string().datetime(), by: z.string().nullable() })
const StatusSchema = z.object({
  /** null: no record yet, e.g. the backup container restarted since the last run. */
  lastRun: LastRunSchema.nullable(),
  running: RunningSchema.nullable(),
})
const BackupListSchema = StatusSchema.extend({ snapshots: z.array(SnapshotSchema) })
const ConflictSchema = z.object({ running: RunningSchema.nullable() })

export type Snapshot = z.infer<typeof SnapshotSchema>
export type LastRun = z.infer<typeof LastRunSchema>
export type Running = z.infer<typeof RunningSchema>
export type BackupApiConfig = { url: string; token: string }

type Denied = { kind: 'forbidden' } | { kind: 'not-configured' } | { kind: 'unavailable' }
export type BackupsResult =
  | Denied
  | { kind: 'ok'; snapshots: Snapshot[]; lastRun: LastRun | null; running: Running | null; stale: boolean }
export type StatusResult = Denied | { kind: 'ok'; lastRun: LastRun | null; running: Running | null }
export type StartResult = Denied | { kind: 'started' } | { kind: 'running'; running: Running | null }
export type DownloadResult =
  | Denied
  | { kind: 'not-found' }
  | { kind: 'bad-passphrase' }
  | { kind: 'ok'; body: ReadableStream<Uint8Array>; filename: string }

/** A restic snapshot id, full or short. Anything else never reaches the backup service's URL. */
const SNAPSHOT_ID = /^[0-9a-f]{8,64}$/
/** Downloads can be large and slow; this bounds one, it doesn't pace it. */
const DOWNLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000

/** Both settings, or none: without either the view says it isn't set up. */
export function backupApiConfig(env: Record<string, string | undefined>): BackupApiConfig | null {
  const url = env.BACKUP_API_URL?.trim().replace(/\/+$/, '')
  const token = env.BACKUP_API_TOKEN?.trim()
  return url && token ? { url, token } : null
}

export type Deps = {
  config: BackupApiConfig | null
  fetch: typeof globalThis.fetch
  now: () => Date
  isAdmin: (user: unknown) => boolean
  log: (level: 'info' | 'error', message: string) => void
}

/** Rights first, before anything leaves this process; then the configuration. */
function gate(user: unknown, deps: Deps): Denied | BackupApiConfig {
  if (!isCmsUser(user) || !deps.isAdmin(user)) return { kind: 'forbidden' }
  return deps.config ?? { kind: 'not-configured' }
}

async function call(config: BackupApiConfig, deps: Deps, path: string, init: RequestInit = {}, timeoutMs = 15_000) {
  return deps.fetch(`${config.url}${path}`, {
    ...init,
    headers: { ...init.headers, 'X-Backup-Token': config.token, 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  })
}

const failed = (deps: Deps, what: string, err: unknown): Denied => {
  deps.log('error', `backups: ${what}: ${err instanceof Error ? err.message : String(err)}`)
  return { kind: 'unavailable' }
}

/** S8.1: the list of backups, the last run and a running backup. */
export async function loadBackups(user: unknown, deps: Deps): Promise<BackupsResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  let list: z.infer<typeof BackupListSchema>
  try {
    // restic lists a remote repository in a few seconds; give it headroom.
    const res = await call(config, deps, '/backups', {}, 75_000)
    if (!res.ok) throw new Error(`backup API answered ${res.status}`)
    list = BackupListSchema.parse(await res.json())
  } catch (err) {
    return failed(deps, 'listing failed', err)
  }
  const snapshots = [...list.snapshots].sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  const newest = snapshots[0]
  const stale = !newest || deps.now().getTime() - Date.parse(newest.time) > STALE_AFTER_MS
  return { kind: 'ok', snapshots, lastRun: list.lastRun, running: list.running, stale }
}

/** S8.5: last run and running backup only (no restic call), for polling while a backup runs. */
export async function loadStatus(user: unknown, deps: Deps): Promise<StatusResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  try {
    const res = await call(config, deps, '/status')
    if (!res.ok) throw new Error(`backup API answered ${res.status}`)
    return { kind: 'ok', ...StatusSchema.parse(await res.json()) }
  } catch (err) {
    return failed(deps, 'status failed', err)
  }
}

const whoIs = (user: unknown) => {
  const email = (user as { email?: unknown }).email
  return typeof email === 'string' && email ? email : `user ${(user as { id?: unknown }).id}`
}

/**
 * S8.2: one backup as a stream, encrypted by the backup service with the
 * passphrase (OpenSSL `enc` format). The passphrase travels in the request
 * body only, never in a URL or a log line. Logged with the admin's email.
 */
export async function openDownload(
  user: unknown,
  id: string,
  passphrase: unknown,
  deps: Deps,
): Promise<DownloadResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  if (!SNAPSHOT_ID.test(id)) return { kind: 'not-found' }
  if (!isValidPassphrase(passphrase)) return { kind: 'bad-passphrase' }
  const who = whoIs(user)
  try {
    const res = await call(
      config,
      deps,
      `/backups/${id}/download`,
      { method: 'POST', body: JSON.stringify({ passphrase, by: who }) },
      DOWNLOAD_TIMEOUT_MS,
    )
    if (res.status === 404) return { kind: 'not-found' }
    if (!res.ok || !res.body) throw new Error(`backup API answered ${res.status}`)
    const named = /filename="(msb-backup-[0-9TZ]+-[0-9a-f]{8,64}\.tar\.gz\.enc)"/.exec(
      res.headers.get('content-disposition') ?? '',
    )
    deps.log('info', `backups: backup ${id} downloaded (encrypted) from the CMS by ${who}`)
    return { kind: 'ok', body: res.body, filename: named?.[1] ?? `msb-backup-${id}.tar.gz.enc` }
  } catch (err) {
    return failed(deps, 'download failed', err)
  }
}

/** S8.5: start a backup now, recorded with the admin's email. One at a time. */
export async function startBackup(user: unknown, deps: Deps): Promise<StartResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  const who = whoIs(user)
  try {
    const res = await call(config, deps, '/backups', { method: 'POST', body: JSON.stringify({ by: who }) })
    if (res.status === 202) {
      deps.log('info', `backups: backup started from the CMS by ${who}`)
      return { kind: 'started' }
    }
    if (res.status === 409) return { kind: 'running', running: ConflictSchema.parse(await res.json()).running }
    throw new Error(`backup API answered ${res.status}`)
  } catch (err) {
    return failed(deps, 'start failed', err)
  }
}
