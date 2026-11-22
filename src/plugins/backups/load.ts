import { z } from 'zod'
import { isCmsUser } from '@/access/admin'

/**
 * Data for the admin backups view (E8, S8.1). The backups live in the backup
 * container; it answers on the internal compose network only, and only to the
 * shared token. This module decides who may ask (admins) and turns the answer
 * into what the view shows.
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
const LastRunSchema = z.object({ status: z.enum(['ok', 'failed']), at: z.string().datetime() })
const BackupListSchema = z.object({
  snapshots: z.array(SnapshotSchema),
  /** null: no record yet, e.g. the backup container restarted since the last run. */
  lastRun: LastRunSchema.nullable(),
})

export type Snapshot = z.infer<typeof SnapshotSchema>
export type LastRun = z.infer<typeof LastRunSchema>
export type BackupApiConfig = { url: string; token: string }

export type BackupsResult =
  | { kind: 'forbidden' }
  | { kind: 'not-configured' }
  | { kind: 'unavailable' }
  | { kind: 'ok'; snapshots: Snapshot[]; lastRun: LastRun | null; stale: boolean }

/** Both settings, or none: without either the view says it isn't set up. */
export function backupApiConfig(env: Record<string, string | undefined>): BackupApiConfig | null {
  const url = env.BACKUP_API_URL?.trim().replace(/\/+$/, '')
  const token = env.BACKUP_API_TOKEN?.trim()
  return url && token ? { url, token } : null
}

type Deps = {
  config: BackupApiConfig | null
  fetch: typeof globalThis.fetch
  now: () => Date
  isAdmin: (user: unknown) => boolean
  log: (message: string) => void
}

export async function loadBackups(user: unknown, deps: Deps): Promise<BackupsResult> {
  // Check rights before anything leaves this process.
  if (!isCmsUser(user) || !deps.isAdmin(user)) return { kind: 'forbidden' }
  if (!deps.config) return { kind: 'not-configured' }

  let list: z.infer<typeof BackupListSchema>
  try {
    const res = await deps.fetch(`${deps.config.url}/backups`, {
      headers: { 'X-Backup-Token': deps.config.token },
      cache: 'no-store',
      // restic lists a remote repository in a few seconds; give it headroom.
      signal: AbortSignal.timeout(75_000),
    })
    if (!res.ok) throw new Error(`backup API answered ${res.status}`)
    list = BackupListSchema.parse(await res.json())
  } catch (err) {
    deps.log(`backups view: ${err instanceof Error ? err.message : String(err)}`)
    return { kind: 'unavailable' }
  }

  const snapshots = [...list.snapshots].sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  const newest = snapshots[0]
  const stale = !newest || deps.now().getTime() - Date.parse(newest.time) > STALE_AFTER_MS
  return { kind: 'ok', snapshots, lastRun: list.lastRun, stale }
}
