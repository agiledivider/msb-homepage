import type { Endpoint, PayloadRequest } from 'payload'
import { isCmsUser } from '@/access/admin'
import { isReviewer } from '../../editorial/access'
import { publisherToken, publisherUrl } from '../types'

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

// Publishing the live site is a reviewer/admin action → editorial:review.
const allowed = (req: PayloadRequest) => isCmsUser(req.user) && isReviewer(req.user)

/** POST /api/publish/trigger — queue a site rebuild + push. */
export const makeTriggerEndpoint = (): Endpoint => ({
  path: '/publish/trigger',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!isCmsUser(req.user)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!allowed(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    try {
      const user = req.user as { email?: string; id: number | string }
      const who = user.email ?? `user ${user.id}`
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
export const makeStatusEndpoint = (): Endpoint => ({
  path: '/publish/status',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    if (!isCmsUser(req.user)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!allowed(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    try {
      return Response.json(await callPublisher('/status'))
    } catch (err) {
      // The widget renders "unavailable" rather than breaking the dashboard.
      return Response.json({ unavailable: true, error: err instanceof Error ? err.message : String(err) })
    }
  },
})

export const makePublishEndpoints = (): Endpoint[] => [makeTriggerEndpoint(), makeStatusEndpoint()]
