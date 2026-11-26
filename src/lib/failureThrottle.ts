/**
 * Slows down guessing at the CMS's doors (S2.6): password login, the Kanidm
 * sign-in and Claude's MCP access. Only FAILED attempts count, per client IP
 * and door; after too many within the window, that IP gets 429 at that door
 * until the oldest failure has aged out. Editors working normally never fail
 * often enough to notice.
 *
 * In memory: one app container, and losing the counters on a restart is
 * harmless. Wired in at the API route (`src/app/(payload)/api/[...slug]/route.ts`).
 */

export type Door = 'login' | 'kanidm' | 'mcp'

export const LIMITS: Record<Door, { failures: number; windowMs: number }> = {
  login: { failures: 10, windowMs: 15 * 60_000 },
  kanidm: { failures: 20, windowMs: 15 * 60_000 },
  mcp: { failures: 10, windowMs: 15 * 60_000 },
}

/** Which door an API path belongs to, if any. */
export function doorFor(pathname: string): Door | undefined {
  if (/^\/api\/users\/(login|forgot-password|reset-password)\/?$/.test(pathname)) return 'login'
  if (pathname.startsWith('/api/users/oauth/')) return 'kanidm'
  if (pathname === '/api/mcp' || pathname.startsWith('/api/mcp/')) return 'mcp'
  return undefined
}

/** A refused login or key (401/403), or a Kanidm callback that sends the user back with an error. */
export function isFailure(door: Door, res: Response): boolean {
  if (res.status === 401 || res.status === 403) return true
  if (door === 'login' && res.status === 400) return true
  if (door === 'kanidm' && res.status >= 300 && res.status < 400) {
    return /[?&]error=/.test(res.headers.get('location') ?? '')
  }
  return false
}

/**
 * The client's IP as Caddy reports it. Caddy replaces X-Forwarded-For with the
 * address it saw (it ignores incoming values unless `trusted_proxies` is set),
 * so the last entry is the one it added.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const last = forwarded?.split(',').at(-1)?.trim()
  return last || headers.get('x-real-ip')?.trim() || 'unknown'
}

const MAX_KEYS = 10_000

export class FailureThrottle {
  private readonly failures = new Map<string, number[]>()

  constructor(private readonly limits: Record<Door, { failures: number; windowMs: number }> = LIMITS) {}

  private recent(door: Door, key: string, now: number): number[] {
    const { windowMs } = this.limits[door]
    const list = (this.failures.get(key) ?? []).filter((t) => now - t < windowMs)
    if (list.length) this.failures.set(key, list)
    else this.failures.delete(key)
    return list
  }

  /** Seconds until this IP may try this door again; 0 when it may try now. */
  retryAfter(door: Door, ip: string, now: number): number {
    const list = this.recent(door, `${door}:${ip}`, now)
    const { failures, windowMs } = this.limits[door]
    if (list.length < failures) return 0
    return Math.ceil((list[0] + windowMs - now) / 1000)
  }

  /** Count a failure; true when this one closes the door (worth a log line). */
  recordFailure(door: Door, ip: string, now: number): boolean {
    const key = `${door}:${ip}`
    const list = this.recent(door, key, now)
    list.push(now)
    this.failures.delete(key) // re-insert: Map order = least recently failed first
    this.failures.set(key, list)
    if (this.failures.size > MAX_KEYS) this.failures.delete(this.failures.keys().next().value as string)
    return list.length === this.limits[door].failures
  }
}
