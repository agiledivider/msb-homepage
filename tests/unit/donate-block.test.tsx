import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type DonateBlock, DonateComponent } from '@/blocks/Donate/Component'

const aDonateBlock = (overrides: Partial<DonateBlock> = {}): DonateBlock => ({
  blockType: 'donate',
  heading: 'So kannst du spenden',
  bank: {
    holder: 'MakerSpace Bonn e.V.',
    bankName: 'Sparkasse KölnBonn',
    iban: 'DE17370501981934016955',
    bic: 'COLSDE33XXX',
    reference: 'Spende MakerSpace Bonn',
  },
  receipt: 'Bis 300 € reicht der Kontoauszug.',
  ...overrides,
})
const html = (b: DonateBlock) => renderToStaticMarkup(<DonateComponent {...b} />)
const qrCount = (s: string) => (s.match(/<svg[^>]*viewBox="0 0 \d+ \d+"/g) ?? []).length

describe('Spenden block (S5.14)', () => {
  it('shows the account, readable IBAN and a transfer QR code', () => {
    const out = html(aDonateBlock())
    expect(out).toContain('DE17 3705 0198 1934 0169 55')
    expect(out).toContain('QR-Code für die Überweisung')
    expect(out).toContain('Bis 300 € reicht der Kontoauszug.')
  })

  it('leaves out the QR code rather than encode a mistyped IBAN', () => {
    const out = html(aDonateBlock({ bank: { holder: 'MakerSpace Bonn e.V.', iban: 'DE18370501981934016955' } }))
    expect(out).not.toContain('QR-Code für die Überweisung')
  })

  it('hides PayPal and betterplace until their links are set', () => {
    const out = html(aDonateBlock())
    expect(out).not.toContain('PayPal')
    expect(out).not.toContain('betterplace')
  })

  it('shows PayPal with its own QR code and betterplace once linked, opening in a new tab', () => {
    const out = html(
      aDonateBlock({
        paypalUrl: 'https://www.paypal.com/donate/?hosted_button_id=X',
        betterplaceUrl: 'https://www.betterplace.org/de/projects/1',
      }),
    )
    expect(out).toContain('Mit PayPal spenden')
    expect(out).toContain('QR-Code zur PayPal-Spende')
    expect(out).toContain('href="https://www.betterplace.org/de/projects/1"')
    expect(out).toMatch(/target="_blank" rel="noopener noreferrer"/)
    expect(qrCount(out)).toBeGreaterThanOrEqual(2)
  })
})
