import type { Endpoint, PayloadRequest } from 'payload'
import { isCmsUser } from '@/access/admin'
import { isAdmin } from '@/plugins/editorial/access'
import { backupApiConfig, type Deps, loadStatus, startBackup } from './load'

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

export const backupEndpoints: Endpoint[] = [runEndpoint, statusEndpoint]
