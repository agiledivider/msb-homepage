/** S2.6: failed attempts at the CMS's doors are counted per IP and door; too many close that door for a while. */
import { describe, expect, it } from 'vitest'
import { clientIp, doorFor, FailureThrottle, isFailure } from '@/lib/failureThrottle'

const LIMITS = {
  login: { failures: 3, windowMs: 60_000 },
  kanidm: { failures: 3, windowMs: 60_000 },
  mcp: { failures: 3, windowMs: 60_000 },
}

describe('which door a request knocks on', () => {
  it.each([
    ['/api/users/login', 'login'],
    ['/api/users/forgot-password', 'login'],
    ['/api/users/reset-password', 'login'],
    ['/api/users/oauth/kanidm', 'kanidm'],
    ['/api/users/oauth/kanidm/callback', 'kanidm'],
    ['/api/mcp', 'mcp'],
    ['/api/users/me', undefined],
    ['/api/events', undefined],
    ['/api/media/file/x.webp', undefined],
    ['/api/users/loginx', undefined],
  ])('%s → %s', (path, door) => {
    expect(doorFor(path)).toBe(door)
  })
})

describe('what counts as a failed attempt', () => {
  const res = (status: number, location?: string) =>
    new Response(null, { status, headers: location ? { location } : {} })
  it.each([
    ['login', res(401), true],
    ['login', res(400), true],
    ['login', res(200), false],
    ['mcp', res(401), true],
    ['mcp', res(200), false],
    ['mcp', res(400), false],
    ['kanidm', res(302, '/admin/login?error=oauth'), true],
    ['kanidm', res(302, '/admin'), false],
    ['kanidm', res(302, 'https://idm.example/ui/oauth2?client_id=payload'), false],
  ] as const)('%s %o → %s', (door, response, failed) => {
    expect(isFailure(door, response)).toBe(failed)
  })
})

describe('client IP behind Caddy', () => {
  it.each([
    [{ 'x-forwarded-for': '203.0.113.7' }, '203.0.113.7'],
    [{ 'x-forwarded-for': '10.0.0.1, 203.0.113.7' }, '203.0.113.7'],
    [{ 'x-real-ip': '198.51.100.2' }, '198.51.100.2'],
    [{}, 'unknown'],
  ])('%j → %s', (headers, ip) => {
    expect(clientIp(new Headers(headers))).toBe(ip)
  })
})

describe('failure throttle', () => {
  it('closes a door after the limit and reopens it when the oldest failure ages out', () => {
    const t = new FailureThrottle(LIMITS)
    expect(t.recordFailure('login', 'a', 0)).toBe(false)
    expect(t.recordFailure('login', 'a', 10_000)).toBe(false)
    expect(t.retryAfter('login', 'a', 10_000)).toBe(0)
    expect(t.recordFailure('login', 'a', 20_000)).toBe(true) // the third closes it
    expect(t.retryAfter('login', 'a', 20_000)).toBe(40) // until the first (t=0) ages out at 60 s
    expect(t.retryAfter('login', 'a', 59_999)).toBe(1)
    expect(t.retryAfter('login', 'a', 60_000)).toBe(0)
  })

  it('keeps IPs and doors apart', () => {
    const t = new FailureThrottle(LIMITS)
    for (const now of [0, 1, 2]) t.recordFailure('mcp', 'a', now)
    expect(t.retryAfter('mcp', 'a', 3)).toBeGreaterThan(0)
    expect(t.retryAfter('mcp', 'b', 3)).toBe(0)
    expect(t.retryAfter('login', 'a', 3)).toBe(0)
  })

  it('lets someone who mistypes now and then keep working', () => {
    const t = new FailureThrottle(LIMITS)
    for (let i = 0; i < 20; i++) {
      t.recordFailure('login', 'a', i * 40_000) // one failure every 40 s, window 60 s
      expect(t.retryAfter('login', 'a', i * 40_000)).toBe(0)
    }
  })
})
