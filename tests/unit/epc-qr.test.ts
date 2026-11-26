import { describe, expect, it } from 'vitest'
import { epcPayload, formatIban, isValidIban, qrSvg } from '@/lib/epcQr'

// The Verein's donation account (Impressum, old "Uns unterstützen" page).
const IBAN = 'DE17 3705 0198 1934 0169 55'

describe('isValidIban', () => {
  it.each([
    [IBAN, true],
    ['de17370501981934016955', true],
    ['DE55 3705 0198 1935 3119 00', true], // membership-fee account
    ['DE18 3705 0198 1934 0169 55', false], // one digit off in the check number
    ['DE17 3705 0198 1934 0169 56', false], // typo in the account
    ['', false],
    ['kein IBAN', false],
  ])('%s → %s', (iban, ok) => {
    expect(isValidIban(iban)).toBe(ok)
  })
})

describe('epcPayload (GiroCode, EPC069-12 v2)', () => {
  it('builds the transfer the banking app pre-fills (golden)', () => {
    expect(
      epcPayload({ name: 'MakerSpace Bonn e.V.', iban: IBAN, bic: 'COLSDE33XXX', reference: 'Spende MakerSpace Bonn' }),
    ).toBe(
      [
        'BCD',
        '002',
        '1',
        'SCT',
        'COLSDE33XXX',
        'MakerSpace Bonn e.V.',
        'DE17370501981934016955',
        '',
        '',
        '',
        'Spende MakerSpace Bonn',
      ].join('\n'),
    )
  })

  it('leaves the amount empty so donors choose it', () => {
    expect(epcPayload({ name: 'MakerSpace Bonn e.V.', iban: IBAN })?.split('\n')[7]).toBe('')
  })

  it.each([
    ['a mistyped IBAN', { name: 'MakerSpace Bonn e.V.', iban: 'DE18 3705 0198 1934 0169 55' }],
    ['no name', { name: '  ', iban: IBAN }],
    ['a name over 70 characters', { name: 'x'.repeat(71), iban: IBAN }],
    ['a malformed BIC', { name: 'MakerSpace Bonn e.V.', iban: IBAN, bic: 'COLS' }],
  ])('refuses %s (no code rather than a wrong one)', (_n, data) => {
    expect(epcPayload(data)).toBeNull()
  })

  it('cuts the reference to the 140 characters the standard allows', () => {
    const p = epcPayload({ name: 'MakerSpace Bonn e.V.', iban: IBAN, reference: 'x'.repeat(200) })
    expect(p?.split('\n')[10]).toHaveLength(140)
  })
})

describe('qrSvg / formatIban', () => {
  it('renders an SVG', () => {
    const svg = qrSvg('BCD\n002\n1\nSCT\n\nMakerSpace Bonn e.V.\nDE17370501981934016955')
    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/)
  })

  it('groups the IBAN in fours', () => {
    expect(formatIban('de17370501981934016955')).toBe('DE17 3705 0198 1934 0169 55')
  })
})
