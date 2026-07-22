import type { Endpoint, PayloadRequest } from 'payload'
import { hasAnyRole } from '../../editorial/access'
import { type PublishOptions, publisherToken, publisherUrl } from '../types'

/**
 * Talk to the publisher service. It lives on the internal compose network and
 * is never exposed publicly — Payload is the only thing that calls it, and only
 * after checking the caller's role here.
 */
async function callPublisher(path: string, init?: RequestInit) {
  const base = publisherUrl()
  if (!base) throw new Error('PUBLISHER_URL is not configured')
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Publish-Token': publisherToken(),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`publisher responded ${res.status}`)
  return res.json()
}

const allowed = (req: PayloadRequest, roles: string[]) => Boolean(req.user) && hasAnyRole(req.user, roles)

/** POST /api/publish/trigger — queue a site rebuild + push. */
export const makeTriggerEndpoint = (roles: string[]): Endpoint => ({
  path: '/publish/trigger',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!allowed(req, roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    try {
      const who = req.user.email ?? `user ${req.user.id}`
      const out = await callPublisher('/publish', {
        method: 'POST',
        body: JSON.stringify({ reason: `manual by ${who}` }),
      })
      return Response.json(out, { status: 202 })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      req.payload.logger.error(`publish trigger failed: ${message}`)
      return Response.json({ error: message }, { status: 502 })
    }
  },
})

/** GET /api/publish/status — current phase + last result, for the admin widget. */
export const makeStatusEndpoint = (roles: string[]): Endpoint => ({
  path: '/publish/status',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!allowed(req, roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    try {
      return Response.json(await callPublisher('/status'))
    } catch (err) {
      // The widget renders "unavailable" rather than breaking the dashboard.
      return Response.json({ unavailable: true, error: err instanceof Error ? err.message : String(err) })
    }
  },
})

export const makePublishEndpoints = (options: Required<Pick<PublishOptions, 'publisherRoles'>>): Endpoint[] => [
  makeTriggerEndpoint(options.publisherRoles),
  makeStatusEndpoint(options.publisherRoles),
]
