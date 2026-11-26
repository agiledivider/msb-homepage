/** S2.5: only the site itself may act with an editor's login cookie; the cookie is HTTPS-only on https sites. */
import { describe, expect, it } from 'vitest'
import { authCookies, trustedOrigins } from '@/lib/requestSecurity'

describe('trusted origins (csrf/cors)', () => {
  it.each([
    [
      { NEXT_PUBLIC_SERVER_URL: 'https://payload.idiot.games', NODE_ENV: 'production' },
      ['https://payload.idiot.games'],
    ],
    [
      { NEXT_PUBLIC_SERVER_URL: 'https://payload.idiot.games/', NODE_ENV: 'production' },
      ['https://payload.idiot.games'],
    ],
    [{ NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000', NODE_ENV: 'development' }, ['http://localhost:3000']],
    [{ NODE_ENV: 'development' }, ['http://localhost:3000']],
    [
      { NEXT_PUBLIC_SERVER_URL: 'http://192.168.2.8:3000', NODE_ENV: 'development' },
      ['http://192.168.2.8:3000', 'http://localhost:3000'],
    ],
  ])('%j → %j', (env, expected) => {
    expect(trustedOrigins(env)).toEqual(expected)
  })

  it('never ends up empty (an empty list turns the check off)', () => {
    expect(trustedOrigins({}).length).toBeGreaterThan(0)
  })
})

describe('login cookie', () => {
  it('is HTTPS-only on https sites, Lax so the Kanidm redirect still logs in', () => {
    expect(authCookies({ NEXT_PUBLIC_SERVER_URL: 'https://payload.idiot.games' })).toEqual({
      secure: true,
      sameSite: 'Lax',
    })
    expect(authCookies({ NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000' }).secure).toBe(false)
  })
})
