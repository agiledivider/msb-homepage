/** Sizes in the backups view: MB, GB, and TB for a Storage Box (S9.2). */
import { describe, expect, it } from 'vitest'
import { fmtSize } from '@/plugins/backups/format'

describe('fmtSize', () => {
  it.each([
    [null, 'unbekannt'],
    [0, '0 MB'],
    [83654208, '79,8 MB'],
    [5 * 1024 ** 3, '5 GB'],
    [1024 ** 4, '1 TB'],
    [930 * 1024 ** 4, '930 TB'],
  ])('%s → %s', (bytes, text) => {
    expect(fmtSize(bytes)).toBe(text)
  })
})
