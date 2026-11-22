import { describe, expect, it } from 'vitest'
import { footerFrom } from '@/lib/mappers'
import type { SiteSetting } from '@/payload-types'

const aSite = (footer: SiteSetting['footer']): SiteSetting => ({ id: 1, footer }) as SiteSetting

describe('footerFrom', () => {
  it('passes filled fields through, trimmed', () => {
    const f = footerFrom(
      aSite({
        tagline: ' Für alle. ',
        phone: '+49 228 1',
        email: 'a@b.de',
        social: [{ platform: 'tiktok', url: 'https://www.tiktok.com/@msb' }],
      }),
    )
    expect(f).toEqual({
      tagline: 'Für alle.',
      phone: '+49 228 1',
      email: 'a@b.de',
      social: [{ platform: 'tiktok', url: 'https://www.tiktok.com/@msb' }],
    })
  })

  it('leaves empty fields undefined so the footer defaults apply', () => {
    expect(footerFrom(aSite({ tagline: '  ', phone: null, email: '' }))).toEqual({
      tagline: undefined,
      phone: undefined,
      email: undefined,
      social: [],
    })
  })

  it('copes with no settings at all', () => {
    expect(footerFrom(null).social).toEqual([])
  })
})
