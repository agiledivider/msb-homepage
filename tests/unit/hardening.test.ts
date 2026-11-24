/** S2.4: preview redirects stay on the site; Kanidm calls time out and log no response bodies. */
import { describe, expect, it } from 'vitest'
import { isSafeRedirectPath } from '@/lib/safePath'
import { kanidmFetch, providerError } from '@/plugins/oidc/http'

describe('preview redirect path', () => {
  it.each([
    ['/', true],
    ['/blog/mein-beitrag', true],
    ['/preview/hero?collection=blog&slug=x', true],
    ['//example.com', false],
    ['/\\example.com', false],
    ['/\t/example.com', false],
    ['https://example.com', false],
    ['javascript:alert(1)', false],
    ['blog', false],
    ['', false],
    [null, false],
  ])('%s → %s', (path, ok) => {
    expect(isSafeRedirectPath(path)).toBe(ok)
  })
})

describe('Kanidm calls', () => {
  it('give up when Kanidm does not answer', async () => {
    // A fake Kanidm that never responds and only stops when the request is aborted.
    const hanging = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)))
    const started = Date.now()
    await expect(
      kanidmFetch('https://idm.invalid/oauth2/token', {}, { fetchImpl: hanging, timeoutMs: 50 }),
    ).rejects.toThrow()
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('report status and OAuth error code only, never the response body', () => {
    const body = { error: 'invalid_grant', error_description: 'code abc123 expired', access_token: 'secret' }
    const message = providerError('Kanidm token exchange', 400, body).message
    expect(message).toBe('Kanidm token exchange failed (400 invalid_grant)')
    expect(message).not.toMatch(/abc123|secret/)
    expect(providerError('Kanidm userinfo request', 502, null).message).toBe('Kanidm userinfo request failed (502)')
  })
})
