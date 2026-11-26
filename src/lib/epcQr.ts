import { renderSVG } from 'uqr'

/**
 * Bank-transfer QR code ("GiroCode", EPC069-12 v2) for the donation page
 * (S5.14). Banking apps scan it and pre-fill a SEPA transfer: recipient, IBAN
 * and reference; the donor enters the amount. Built here, not by an online
 * generator, so the account in the code is exactly the one in the CMS.
 *
 * Format (one field per line, UTF-8):
 *   BCD · 002 · 1 (UTF-8) · SCT · BIC (optional in v2) · name · IBAN ·
 *   amount (empty: donor chooses) · purpose code · structured ref · text
 */

/** "DE17 3705 …" → "DE17370…" */
export const normalizeIban = (iban: string) => iban.replace(/\s+/g, '').toUpperCase()

/** ISO 13616 mod-97 check, so a typo in the CMS never ends up in a printed code. */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  let rest = 0
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97
  return rest === 1
}

export type EpcTransfer = { name: string; iban: string; bic?: string | null; reference?: string | null }

/** The text inside the QR code, or null when the data can't make a valid code. */
export function epcPayload({ name, iban, bic, reference }: EpcTransfer): string | null {
  const n = name.trim()
  if (!n || n.length > 70 || !isValidIban(iban)) return null
  const b = (bic ?? '').replace(/\s+/g, '').toUpperCase()
  if (b && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(b)) return null
  const text = (reference ?? '').trim().slice(0, 140)
  return ['BCD', '002', '1', 'SCT', b, n, normalizeIban(iban), '', '', '', text].join('\n')
}

/** An inline SVG of the QR code (error correction M, as the EPC standard asks). */
export function qrSvg(text: string): string {
  return renderSVG(text, { ecc: 'M', border: 2, whiteColor: 'white', blackColor: 'black' }) // pure black on white scans best
}

/** "DE17370501981934016955" → "DE17 3705 0198 1934 0169 55" for reading and copying. */
export const formatIban = (iban: string) =>
  normalizeIban(iban)
    .replace(/(.{4})/g, '$1 ')
    .trim()
