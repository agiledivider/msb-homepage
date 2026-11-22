/**
 * Hero headline size follows its length, so long titles shrink instead of
 * pushing the lede and buttons off the fixed-height mat (2026-11-22, the
 * "Lebkuchenhaus bauen: Workshop mit Bernd am 28. November" overflow).
 */
import { describe, expect, it } from 'vitest'
import { headlineSize } from '@/blocks/Hero/Component'

describe('hero headline size', () => {
  it.each([
    ['Lebkuchenhaus bauen', false, 'md:text-[56px]'],
    ['Bald mehr aus der Werkstatt.', false, 'md:text-[46px]'],
    ['Lebkuchenhaus bauen: Workshop mit Bernd am 28. November', false, 'md:text-[38px]'],
    ['Löten für Einsteiger', true, 'md:text-[38px]'],
    ['Offene Werkstatt mit Lasercutter-Einweisung', true, 'md:text-[32px]'],
  ])('%s (event: %s) → %s', (headline, isEvent, cls) => {
    expect(headlineSize(headline, isEvent)).toBe(cls)
  })

  it('never grows with length', () => {
    const sizes = [5, 22, 23, 40, 41, 80].map((n) => Number(headlineSize('x'.repeat(n), false).match(/\d+/)?.[0]))
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
  })

  it('counts line breaks and runs of spaces as one space', () => {
    expect(headlineSize('Lebkuchenhaus\nbauen', false)).toBe(headlineSize('Lebkuchenhaus bauen', false))
  })
})
