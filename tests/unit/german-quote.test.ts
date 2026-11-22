import { describe, expect, it } from 'vitest'
import { germanQuote } from '@/lib/germanQuote'

describe('germanQuote', () => {
  it.each([
    ['Bonn hat eine Werkstatt.', '„Bonn hat eine Werkstatt.“'],
    ['„Bonn hat eine Werkstatt."', '„Bonn hat eine Werkstatt.“'],
    ['"Straight quotes"', '„Straight quotes“'],
    ['“English quotes”', '„English quotes“'],
    ['«Guillemets»', '„Guillemets“'],
    ['  „Spaces around“  ', '„Spaces around“'],
    ['Er sagte „hallo“ zu mir', '„Er sagte „hallo“ zu mir“'],
    ['', ''],
    ['„“', ''],
  ])('%j → %j', (input, expected) => {
    expect(germanQuote(input)).toBe(expected)
  })

  it('is idempotent', () => {
    for (const s of ['„a“', '"b"', 'c']) expect(germanQuote(germanQuote(s))).toBe(germanQuote(s))
  })
})
