import type { Endpoint, PayloadRequest } from 'payload'
import { isCmsUser } from '@/access/admin'
import { isAdmin } from '@/plugins/editorial/access'
import {
  backupApiConfig,
  checkUpload,
  type Deps,
  discardUpload,
  loadPreview,
  loadStatus,
  openDownload,
  restoreUpload,
  startBackup,
  startRestore,
  uploadBackup,
} from './load'

const deps = (req: PayloadRequest): Deps => ({
  config: backupApiConfig(process.env),
  fetch: globalThis.fetch,
  now: () => new Date(),
  isAdmin,
  log: (level, m) => req.payload.logger[level](m),
})

const httpStatus = { forbidden: 403, 'not-configured': 503, unavailable: 502 } as const
const denied = (req: PayloadRequest, kind: keyof typeof httpStatus) =>
  Response.json({ error: kind }, { status: kind === 'forbidden' && !isCmsUser(req.user) ? 401 : httpStatus[kind] })

/** POST /api/backups/run — an admin starts a backup now (S8.5). */
const runEndpoint: Endpoint = {
  path: '/backups/run',
  method: 'post',
  handler: async (req) => {
    const out = await startBackup(req.user, deps(req))
    switch (out.kind) {
      case 'started':
        return Response.json(out, { status: 202 })
      case 'running':
        return Response.json(out, { status: 409 })
      default:
        return denied(req, out.kind)
    }
  },
}

/** GET /api/backups/status — running backup + last run, polled by the button while a backup runs. */
const statusEndpoint: Endpoint = {
  path: '/backups/status',
  method: 'get',
  handler: async (req) => {
    const out = await loadStatus(req.user, deps(req))
    return out.kind === 'ok' ? Response.json(out) : denied(req, out.kind)
  },
}

/**
 * POST /api/backups/download — one backup, encrypted with the passphrase the
 * admin was shown (S8.2). A form post (id, passphrase) so the browser saves
 * the answer as a file and the passphrase never appears in a URL.
 */
const downloadEndpoint: Endpoint = {
  path: '/backups/download',
  method: 'post',
  handler: async (req) => {
    const form = await req.formData?.().catch(() => null)
    const id = form?.get('id')
    const out = await openDownload(req.user, typeof id === 'string' ? id : '', form?.get('passphrase'), deps(req))
    switch (out.kind) {
      case 'ok':
        return new Response(out.body, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${out.filename}"`,
            'Cache-Control': 'no-store',
          },
        })
      case 'not-found':
        return Response.json({ error: 'no such backup' }, { status: 404 })
      case 'bad-passphrase':
        return Response.json({ error: 'passphrase missing or too weak' }, { status: 400 })
      default:
        return denied(req, out.kind)
    }
  },
}

/** GET /api/backups/preview?id=<snapshot> — what restoring this backup would bring back (S8.3). */
const previewEndpoint: Endpoint = {
  path: '/backups/preview',
  method: 'get',
  handler: async (req) => {
    const id = typeof req.query?.id === 'string' ? req.query.id : ''
    const out = await loadPreview(req.user, id, deps(req))
    if (out.kind === 'ok') return Response.json(out.preview)
    if (out.kind === 'not-found') return Response.json({ error: 'no such backup' }, { status: 404 })
    return denied(req, out.kind)
  },
}

/** POST /api/backups/restore { id, confirm } — restore the whole site from a backup (S8.3). */
const restoreEndpoint: Endpoint = {
  path: '/backups/restore',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.().catch(() => null)) as { id?: unknown; confirm?: unknown } | null
    const id = typeof body?.id === 'string' ? body.id : ''
    const out = await startRestore(req.user, id, body?.confirm, deps(req))
    switch (out.kind) {
      case 'started':
        return Response.json(out, { status: 202 })
      case 'running':
        return Response.json(out, { status: 409 })
      case 'not-found':
        return Response.json({ error: 'no such backup' }, { status: 404 })
      case 'bad-confirm':
        return Response.json({ error: 'type the backup id to confirm' }, { status: 400 })
      default:
        return denied(req, out.kind)
    }
  },
}

const jsonBody = async (req: PayloadRequest) =>
  ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** POST /api/backups/upload — a backup file (raw body), streamed on to the backup service (S8.4). */
const uploadEndpoint: Endpoint = {
  path: '/backups/upload',
  method: 'post',
  handler: async (req) => {
    const out = await uploadBackup(req.user, req.body ?? null, deps(req))
    switch (out.kind) {
      case 'ok':
        return Response.json(out, { status: 201 })
      case 'too-large':
        return Response.json({ error: 'file too large' }, { status: 413 })
      case 'busy':
        return Response.json({ error: 'a backup or restore is running' }, { status: 409 })
      default:
        return denied(req, out.kind)
    }
  },
}

/** POST /api/backups/upload-check { uploadId, passphrase } — decrypt, check and preview an upload (S8.4). */
const uploadCheckEndpoint: Endpoint = {
  path: '/backups/upload-check',
  method: 'post',
  handler: async (req) => {
    const body = await jsonBody(req)
    const out = await checkUpload(req.user, str(body.uploadId), body.passphrase, deps(req))
    switch (out.kind) {
      case 'ok':
        return Response.json(out.preview)
      case 'not-found':
        return Response.json({ error: 'no such upload' }, { status: 404 })
      case 'bad-passphrase':
      case 'wrong-password':
      case 'not-a-backup':
        return Response.json({ code: out.kind }, { status: 422 })
      default:
        return denied(req, out.kind)
    }
  },
}

/** POST /api/backups/upload-restore { uploadId, confirm } — restore a checked upload (S8.4). */
const uploadRestoreEndpoint: Endpoint = {
  path: '/backups/upload-restore',
  method: 'post',
  handler: async (req) => {
    const body = await jsonBody(req)
    const out = await restoreUpload(req.user, str(body.uploadId), body.confirm, deps(req))
    switch (out.kind) {
      case 'started':
        return Response.json(out, { status: 202 })
      case 'running':
        return Response.json(out, { status: 409 })
      case 'not-found':
        return Response.json({ error: 'no checked upload' }, { status: 404 })
      case 'bad-confirm':
        return Response.json({ error: 'type the upload id to confirm' }, { status: 400 })
      default:
        return denied(req, out.kind)
    }
  },
}

/** POST /api/backups/upload-discard { uploadId } — throw an upload away (S8.4). */
const uploadDiscardEndpoint: Endpoint = {
  path: '/backups/upload-discard',
  method: 'post',
  handler: async (req) => {
    const out = await discardUpload(req.user, str((await jsonBody(req)).uploadId), deps(req))
    return out.kind === 'ok' ? new Response(null, { status: 204 }) : denied(req, out.kind)
  },
}

export const backupEndpoints: Endpoint[] = [
  runEndpoint,
  statusEndpoint,
  downloadEndpoint,
  previewEndpoint,
  restoreEndpoint,
  uploadEndpoint,
  uploadCheckEndpoint,
  uploadRestoreEndpoint,
  uploadDiscardEndpoint,
]
