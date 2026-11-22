/**
 * Signed preview links (pure): a token opens exactly the one document it was
 * made for, only until it expires, and only if nobody changed it.
 */
import { describe, expect, it } from 'vitest'
import { PREVIEW_TTL_MS, signPreviewToken, verifyPreviewToken } from '@/lib/previewToken'

const SECRET = 'test-secret'
const NOW = new Date('2026-11-22T10:00:00Z')
const later = (ms: number) => new Date(NOW.getTime() + ms)
const token = signPreviewToken({ collection: 'blog', id: 5 }, SECRET, NOW)

const swapBody = (t: string, body: object) =>
  `${Buffer.from(JSON.stringify(body)).toString('base64url')}.${t.split('.')[1]}`

describe('preview token', () => {
  it('opens the document it was made for', () => {
    expect(verifyPreviewToken(token, SECRET, NOW)).toEqual({ collection: 'blog', id: 5 })
    expect(verifyPreviewToken(token, SECRET, later(PREVIEW_TTL_MS - 1))).toEqual({ collection: 'blog', id: 5 })
  })

  it('works for events too', () => {
    const t = signPreviewToken({ collection: 'events', id: 12 }, SECRET, NOW)
    expect(verifyPreviewToken(t, SECRET, NOW)).toEqual({ collection: 'events', id: 12 })
  })

  it.each([
    ['expired', token, SECRET, later(PREVIEW_TTL_MS)],
    ['signed with another secret', token, 'other-secret', NOW],
    [
      'pointed at another document',
      swapBody(token, { c: 'blog', i: 6, e: later(PREVIEW_TTL_MS).getTime() }),
      SECRET,
      NOW,
    ],
    ['given a longer life', swapBody(token, { c: 'blog', i: 5, e: later(10 * PREVIEW_TTL_MS).getTime() }), SECRET, NOW],
    ['with a cut signature', token.slice(0, -2), SECRET, NOW],
    ['without a signature', token.split('.')[0], SECRET, NOW],
    ['with an extra part', `${token}.x`, SECRET, NOW],
    ['empty', '', SECRET, NOW],
    ['garbage', 'not-a-token', SECRET, NOW],
  ])('refuses a token that is %s', (_, t, secret, now) => {
    expect(verifyPreviewToken(t as string, secret as string, now as Date)).toBeUndefined()
  })

  it('needs a secret', () => {
    expect(() => signPreviewToken({ collection: 'blog', id: 1 }, '', NOW)).toThrow()
  })
})
