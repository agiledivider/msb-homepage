/**
 * S2.3: the app and both static adapters send the same security headers, and
 * nginx doesn't lose them in locations that set their own add_header.
 */
import { describe, expect, it } from 'vitest'
import { htaccess, nginxConf } from '../../scripts/publish-static'
import { contentSecurityPolicy, securityHeaders } from '../../src/lib/securityHeaders.mjs'
import { SPACE_API } from '../../src/lib/spaceState'

const keys = (dev: boolean) => securityHeaders({ dev }).map((h) => h.key)

describe('security headers', () => {
  it('protect against framing, sniffing and downgrade in production', () => {
    expect(keys(false)).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security',
      ]),
    )
    const csp = contentSecurityPolicy()
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain('unsafe-eval')
  })

  it("let the site reach the SpaceAPI for the top strip's open/closed state", () => {
    expect(contentSecurityPolicy()).toContain(`connect-src 'self' ${new URL(SPACE_API).origin}`)
  })

  it('leave HSTS out and allow HMR in development', () => {
    expect(keys(true)).not.toContain('Strict-Transport-Security')
    expect(contentSecurityPolicy({ dev: true })).toContain("'unsafe-eval'")
  })

  it('reach every nginx location that sets its own add_header', () => {
    const conf = nginxConf([])
    const locations = conf.split(/\n\s*location /).slice(1)
    const withOwnHeaders = locations.filter((l) => l.split('\n    }')[0].includes('add_header Cache-Control'))
    expect(withOwnHeaders.length).toBeGreaterThan(0)
    for (const l of withOwnHeaders) expect(l.split('\n    }')[0]).toContain('add_header Content-Security-Policy')
    expect(conf.split('location /')[0]).toContain('add_header X-Frame-Options "SAMEORIGIN" always;')
  })

  it('are set by Apache on every response', () => {
    const conf = htaccess([])
    for (const key of keys(false)) expect(conf).toContain(`Header always set ${key} "`)
  })
})
