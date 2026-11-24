/**
 * S4.7: the footer shows the styleguide's Negativ logo (green signet, white
 * lettering; the claim is the footer's own tagline) and one phone format
 * (DIN 5008, "0228 81286980") that dials internationally.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Footer, telHref } from '@/components/Footer'

describe('footer (S4.7)', () => {
  it('uses the Negativ logo and the DIN 5008 phone number', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('/logo/logo-horizontal-no-claim-negativ.png')
    expect(html).toContain('0228 81286980')
    expect(html).toContain('href="tel:+4922881286980"')
  })

  it.each([
    ['0228 81286980', 'tel:+4922881286980'],
    ['+49 228 81286980', 'tel:+4922881286980'],
    ['0049 228 81286980', 'tel:+4922881286980'],
    ['(0228) 812 869-80', 'tel:+4922881286980'],
  ])('%s dials %s', (shown, href) => {
    expect(telHref(shown)).toBe(href)
  })
})
