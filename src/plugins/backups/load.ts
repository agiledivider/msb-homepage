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
  /** The safety backup a restore took of the state it replaced (S8.3). */
  beforeRestore: z.boolean(),
})
const LastRunSchema = z.object({
  status: z.enum(['ok', 'failed']),
  at: z.string().datetime(),
  /** Who started it in the CMS; null = the nightly run. */
  by: z.string().nullable(),
})
const RunningSchema = z.object({
  startedAt: z.string().datetime(),
  by: z.string().nullable(),
  kind: z.enum(['backup', 'restore']),
  snapshot: z.string().nullable(),
})
const LastRestoreSchema = z.object({
  status: z.enum(['ok', 'failed']),
  at: z.string().datetime(),
  by: z.string().nullable(),
  /** A backup from the list, or an uploaded file (S8.4); `snapshot` is then the upload id. */
  source: z.enum(['backup', 'upload']),
  snapshot: z.string(),
  /** The backup of the state before; null when the restore failed before taking it. */
  safety: z.string().nullable(),
  code: z.enum([
    'restored',
    'unreadable',
    'no-database',
    'damaged',
    'other-version',
    'safety-failed',
    'media-failed',
    'database-failed',
    'unknown',
  ]),
  message: z.string(),
})
const StatusSchema = z.object({
  /** null: no record yet, e.g. the backup container restarted since the last run. */
  lastRun: LastRunSchema.nullable(),
  running: RunningSchema.nullable(),
  lastRestore: LastRestoreSchema.nullable(),
})
const CountsSchema = z.object({
  pages: z.number().int().nullable(),
  blog: z.number().int().nullable(),
  events: z.number().int().nullable(),
  media: z.number().int().nullable(),
  users: z.number().int().nullable(),
})
const ContentsSchema = z.object({ counts: CountsSchema, mediaFiles: z.number().int() })
const ContentsPreviewSchema = z.object({
  integrity: z.enum(['ok', 'damaged']),
  /** Same database structure as the running site: only then can it be restored here. */
  compatible: z.boolean(),
  /** Tables whose structure differs (at most 10); empty when compatible. */
  differences: z.array(z.string()).default([]),
  backup: ContentsSchema,
  live: ContentsSchema,
})
const PreviewSchema = ContentsPreviewSchema.extend({ snapshot: SnapshotSchema })
const UploadCheckSchema = ContentsPreviewSchema.extend({ uploadId: z.string() })
const BackupListSchema = StatusSchema.extend({ snapshots: z.array(SnapshotSchema) })
const ConflictSchema = z.object({ running: RunningSchema.nullable() })

export type Snapshot = z.infer<typeof SnapshotSchema>
export type LastRun = z.infer<typeof LastRunSchema>
export type Running = z.infer<typeof RunningSchema>
export type LastRestore = z.infer<typeof LastRestoreSchema>
export type Preview = z.infer<typeof PreviewSchema>
/** What a restore preview shows, for a backup from the list or an uploaded file. */
export type ContentsPreview = z.infer<typeof ContentsPreviewSchema>
export type BackupApiConfig = { url: string; token: string }

type Denied = { kind: 'forbidden' } | { kind: 'not-configured' } | { kind: 'unavailable' }
export type BackupsResult =
  | Denied
  | {
      kind: 'ok'
      snapshots: Snapshot[]
      lastRun: LastRun | null
      running: Running | null
      lastRestore: LastRestore | null
      stale: boolean
    }
export type StatusResult =
  | Denied
  | { kind: 'ok'; lastRun: LastRun | null; running: Running | null; lastRestore: LastRestore | null }
export type PreviewResult = Denied | { kind: 'not-found' } | { kind: 'ok'; preview: Preview }
export type UploadResult = Denied | { kind: 'too-large' } | { kind: 'busy' } | { kind: 'ok'; uploadId: string }
export type UploadCheckResult =
  | Denied
  | { kind: 'not-found' }
  | { kind: 'bad-passphrase' }
  | { kind: 'wrong-password' }
  | { kind: 'not-a-backup' }
  | { kind: 'ok'; preview: ContentsPreview }
export type RestoreResult =
  | Denied
  | { kind: 'not-found' }
  | { kind: 'bad-confirm' }
  | { kind: 'started' }
  | { kind: 'running'; running: Running | null }
export type StartResult = Denied | { kind: 'started' } | { kind: 'running'; running: Running | null }
export type DownloadResult =
  | Denied
  | { kind: 'not-found' }
  | { kind: 'bad-passphrase' }
  | { kind: 'ok'; body: ReadableStream<Uint8Array>; filename: string }

/** A restic snapshot id, full or short. Anything else never reaches the backup service's URL. */
const SNAPSHOT_ID = /^[0-9a-f]{8,64}$/
/** An upload's id, as the backup service hands them out. */
const UPLOAD_ID = /^[0-9a-f]{8}$/
/** Uploads can be large and slow; this bounds one. */
const UPLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000
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
  return { kind: 'ok', snapshots, lastRun: list.lastRun, running: list.running, lastRestore: list.lastRestore, stale }
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

/** S8.3: what a backup holds next to the live site, and whether it can be restored here. */
export async function loadPreview(user: unknown, id: string, deps: Deps): Promise<PreviewResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  if (!SNAPSHOT_ID.test(id)) return { kind: 'not-found' }
  try {
    // Reading the backup's database out of the repository takes a moment.
    const res = await call(config, deps, `/backups/${id}/preview`, {}, 120_000)
    if (res.status === 404) return { kind: 'not-found' }
    if (!res.ok) throw new Error(`backup API answered ${res.status}`)
    return { kind: 'ok', preview: PreviewSchema.parse(await res.json()) }
  } catch (err) {
    return failed(deps, 'preview failed', err)
  }
}

/**
 * S8.3: restore the whole site from a backup while it runs. `confirm` must be
 * the backup's short id, typed by the admin. The backup service takes a
 * safety backup first. Logged with the admin's email.
 */
export async function startRestore(user: unknown, id: string, confirm: unknown, deps: Deps): Promise<RestoreResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  if (!SNAPSHOT_ID.test(id)) return { kind: 'not-found' }
  if (typeof confirm !== 'string' || confirm.trim() !== id) return { kind: 'bad-confirm' }
  const who = whoIs(user)
  try {
    const res = await call(config, deps, `/backups/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirm: confirm.trim(), by: who }),
    })
    if (res.status === 202) {
      deps.log('info', `backups: restore of backup ${id} started from the CMS by ${who}`)
      return { kind: 'started' }
    }
    if (res.status === 404) return { kind: 'not-found' }
    if (res.status === 400) return { kind: 'bad-confirm' }
    if (res.status === 409) return { kind: 'running', running: ConflictSchema.parse(await res.json()).running }
    throw new Error(`backup API answered ${res.status}`)
  } catch (err) {
    return failed(deps, 'restore failed', err)
  }
}

/**
 * S8.4: pass an uploaded backup file through to the backup service as a
 * stream (never held in memory here). It replaces any earlier upload.
 */
export async function uploadBackup(
  user: unknown,
  body: ReadableStream<Uint8Array> | null,
  deps: Deps,
): Promise<UploadResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  if (!body) return { kind: 'too-large' }
  try {
    const res = await call(
      config,
      deps,
      '/uploads',
      // duplex: Node's fetch needs it to send a stream body.
      { method: 'POST', body, headers: { 'Content-Type': 'application/octet-stream' }, duplex: 'half' } as RequestInit,
      UPLOAD_TIMEOUT_MS,
    )
    if (res.status === 413) return { kind: 'too-large' }
    if (res.status === 409) return { kind: 'busy' }
    if (res.status !== 201) throw new Error(`backup API answered ${res.status}`)
    const { uploadId } = z.object({ uploadId: z.string().regex(UPLOAD_ID) }).parse(await res.json())
    deps.log('info', `backups: backup file uploaded as ${uploadId} by ${whoIs(user)}`)
    return { kind: 'ok', uploadId }
  } catch (err) {
    return failed(deps, 'upload failed', err)
  }
}

/** S8.4: decrypt and check an upload with its password; on success, what restoring it would bring back. */
export async function checkUpload(
  user: unknown,
  uploadId: string,
  passphrase: unknown,
  deps: Deps,
): Promise<UploadCheckResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  if (!UPLOAD_ID.test(uploadId)) return { kind: 'not-found' }
  if (!isValidPassphrase(passphrase)) return { kind: 'bad-passphrase' }
  try {
    // Decrypting and unpacking a large backup takes a while.
    const res = await call(
      config,
      deps,
      `/uploads/${uploadId}/check`,
      { method: 'POST', body: JSON.stringify({ passphrase }) },
      30 * 60_000,
    )
    if (res.status === 404) return { kind: 'not-found' }
    if (res.status === 422) {
      const { code } = z.object({ code: z.enum(['wrong-password', 'not-a-backup']) }).parse(await res.json())
      return { kind: code }
    }
    if (!res.ok) throw new Error(`backup API answered ${res.status}`)
    const { uploadId: _id, ...preview } = UploadCheckSchema.parse(await res.json())
    return { kind: 'ok', preview }
  } catch (err) {
    return failed(deps, 'upload check failed', err)
  }
}

/** S8.4: restore a checked upload like a backup (S8.3); `confirm` must be the upload id. */
export async function restoreUpload(
  user: unknown,
  uploadId: string,
  confirm: unknown,
  deps: Deps,
): Promise<RestoreResult> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  if (!UPLOAD_ID.test(uploadId)) return { kind: 'not-found' }
  if (typeof confirm !== 'string' || confirm.trim() !== uploadId) return { kind: 'bad-confirm' }
  const who = whoIs(user)
  try {
    const res = await call(config, deps, `/uploads/${uploadId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirm: confirm.trim(), by: who }),
    })
    if (res.status === 202) {
      deps.log('info', `backups: restore of uploaded backup ${uploadId} started from the CMS by ${who}`)
      return { kind: 'started' }
    }
    if (res.status === 404) return { kind: 'not-found' }
    if (res.status === 400) return { kind: 'bad-confirm' }
    if (res.status === 409) return { kind: 'running', running: ConflictSchema.parse(await res.json()).running }
    throw new Error(`backup API answered ${res.status}`)
  } catch (err) {
    return failed(deps, 'upload restore failed', err)
  }
}

/** S8.4: throw an upload away (the admin cancelled). */
export async function discardUpload(user: unknown, uploadId: string, deps: Deps): Promise<Denied | { kind: 'ok' }> {
  const config = gate(user, deps)
  if ('kind' in config) return config
  if (!UPLOAD_ID.test(uploadId)) return { kind: 'ok' }
  try {
    const res = await call(config, deps, `/uploads/${uploadId}`, { method: 'DELETE' })
    if (res.status !== 204) throw new Error(`backup API answered ${res.status}`)
    return { kind: 'ok' }
  } catch (err) {
    return failed(deps, 'discarding the upload failed', err)
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
