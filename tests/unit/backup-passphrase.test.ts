/** S8.2: generated passwords for encrypted backup downloads. */
import { describe, expect, it } from 'vitest'
import { generatePassphrase, isValidPassphrase, PASSPHRASE_ALPHABET } from '@/plugins/backups/passphrase'

describe('generatePassphrase', () => {
  it('is six groups of four from the look-alike-free alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassphrase()
      expect(p).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){5}$/)
      for (const c of p.replaceAll('-', '')) expect(PASSPHRASE_ALPHABET).toContain(c)
    }
  })

  it('has no look-alikes', () => {
    for (const c of 'il1o0') expect(PASSPHRASE_ALPHABET).not.toContain(c)
  })

  it('carries about 119 bits', () => {
    expect(24 * Math.log2(PASSPHRASE_ALPHABET.length)).toBeGreaterThan(118)
  })

  it('never repeats (1000 draws)', () => {
    expect(new Set(Array.from({ length: 1000 }, () => generatePassphrase())).size).toBe(1000)
  })

  it('spreads characters evenly (no modulo bias)', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 4000; i++)
      for (const c of generatePassphrase().replaceAll('-', '')) counts.set(c, (counts.get(c) ?? 0) + 1)
    const expected = (4000 * 24) / PASSPHRASE_ALPHABET.length
    for (const c of PASSPHRASE_ALPHABET) expect(Math.abs((counts.get(c) ?? 0) - expected) / expected).toBeLessThan(0.1)
  })

  it('skips bytes that would bias the result', () => {
    // 248 = 8 × 31 is the first byte above the limit; only the 5s may be used.
    const fake = () => new Uint8Array(48).map((_, i) => (i % 2 ? 248 : 5))
    expect(generatePassphrase(fake)).toBe('ffff-ffff-ffff-ffff-ffff-ffff')
  })

  it('is valid for the backup service', () => {
    expect(isValidPassphrase(generatePassphrase())).toBe(true)
  })
})
