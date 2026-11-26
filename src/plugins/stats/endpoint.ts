import type { Endpoint, PayloadRequest } from 'payload'
import { isBot, parseHit } from '@/lib/stats/hit'
import { recordHit } from './record'

/**
 * The site's own host, from the beacon request. Browsers send `Origin` on every
 * POST; the beacon is same-origin only, so that is the site itself.
 */
function ownHost(headers: Headers): string | null {
  const origin = headers.get('origin')
  if (origin) {
    try {
      return new URL(origin).host
    } catch {
      return null
    }
  }
  return headers.get('host')
}

/**
 * Only the site's own pages may count: a browser marks a same-origin request
 * with `Sec-Fetch-Site: same-origin`; one that sends no such header must at
 * least come from the same origin it is addressed to.
 */
function sameOrigin(headers: Headers): boolean {
  const site = headers.get('sec-fetch-site')
  if (site) return site === 'same-origin'
  const origin = headers.get('origin')
  const host = headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

const done = () => new Response(null, { status: 204 })

export type StatsDeps = { now: () => Date; record: typeof recordHit }
const realDeps: StatsDeps = { now: () => new Date(), record: recordHit }

/**
 * POST /api/stats/hit: the beacon on every public page (S5.11). Public on
 * purpose: visitors aren't logged in. It stores no request data, only +1 on the
 * day's totals (src/lib/stats/hit.ts decides what counts). Ignored hits get the
 * same 204 as counted ones. Logged-in CMS users (editors checking pages) and
 * automated clients are not counted.
 */
export const statsHitHandler =
  (deps: StatsDeps = realDeps) =>
  async (req: PayloadRequest): Promise<Response> => {
    const headers = req.headers
    if (!sameOrigin(headers)) return new Response(null, { status: 403 })
    if (req.user || isBot(headers.get('user-agent'))) return done()
    const host = ownHost(headers)
    if (!host) return done()

    let body: unknown
    try {
      const text = (await req.text?.()) ?? ''
      if (text.length > 4000) return new Response(null, { status: 413 })
      body = JSON.parse(text)
    } catch {
      return new Response(null, { status: 400 })
    }

    const hit = parseHit(body, host, deps.now())
    if (!hit) return done()
    try {
      await deps.record(req.payload, hit)
    } catch (err) {
      // Counting must never break a page; a lost +1 is harmless.
      req.payload.logger.warn({ err }, 'stats: could not record a hit')
    }
    return done()
  }

export const statsHitEndpoint: Endpoint = { path: '/stats/hit', method: 'post', handler: statsHitHandler() }
