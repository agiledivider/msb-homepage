import { z } from 'zod'
import { isCmsUser } from '@/access/admin'

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
    headers: { 'X-Backup-Token': config.token, 'Content-Type': 'application/json' },
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

/** S8.5: start a backup now, recorded with the admin's email. One at a time. */
export async function startBackup(user: unknown, deps: Deps): Promise<StartResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  const by = (user as { email?: unknown }).email
  const who = typeof by === 'string' && by ? by : `user ${(user as { id?: unknown }).id}`
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
