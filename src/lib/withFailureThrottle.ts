import config from '@payload-config'
import { getPayload } from 'payload'
import { clientIp, type Door, doorFor, FailureThrottle, isFailure } from './failureThrottle'

type Handler = (req: Request, ctx: { params: Promise<{ slug: string[] }> }) => Promise<Response>

const throttle = new FailureThrottle()

const DOOR_NAMES: Record<Door, string> = { login: 'password login', kanidm: 'Kanidm sign-in', mcp: 'MCP (AI key)' }

/** Wraps a Payload REST handler with the failed-attempt limit (S2.6, src/lib/failureThrottle.ts). */
export function withFailureThrottle(handler: Handler, clock: () => number = Date.now): Handler {
  return async (req, ctx) => {
    const door = doorFor(new URL(req.url).pathname)
    if (!door) return handler(req, ctx)

    const ip = clientIp(req.headers)
    const wait = throttle.retryAfter(door, ip, clock())
    if (wait > 0) {
      return Response.json(
        { errors: [{ message: 'Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.' }] },
        { status: 429, headers: { 'Retry-After': String(wait) } },
      )
    }

    const res = await handler(req, ctx)
    if (isFailure(door, res) && throttle.recordFailure(door, ip, clock())) {
      const payload = await getPayload({ config })
      payload.logger.warn(`[throttle] ${DOOR_NAMES[door]}: too many failed attempts from ${ip}, refusing for a while`)
    }
    return res
  }
}
