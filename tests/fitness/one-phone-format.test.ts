/**
 * Fitness (S4.7): the MakerSpace's phone number is written one way in code
 * and seeds: DIN 5008 "0228 81286980". Other spellings that were in use
 * ("+49 (228) 81 28 69 80", "+49 228 81 28 69 80", "81 28 69 80") fail.
 * Migrations are history and are not scanned.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../src')
const SKIP = [path.join(ROOT, 'migrations'), path.join(ROOT, 'payload-types.ts')]

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (SKIP.some((s) => full.startsWith(s))) return []
    if (e.isDirectory()) return files(full)
    return /\.(tsx?|json)$/.test(e.name) ? [full] : []
  })

// The digits of the number, in any grouping other than "0228 81286980"; `tel:` targets are international on purpose.
const NUMBER = /(?<!tel:)(?:\+49|0049|\b0)[\s()/-]*228[\s()/-]*8[\s-]?1[\s-]?2[\s-]?8[\s-]?6[\s-]?9[\s-]?8[\s-]?0/g

describe('one phone format (fitness)', () => {
  it('writes the MakerSpace number only as "0228 81286980"', () => {
    const wrong = files(ROOT).flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(NUMBER)]
        .map((m) => m[0])
        .filter((m) => m !== '0228 81286980')
        .map((m) => `${path.relative(ROOT, f)}: ${m}`),
    )
    expect(wrong).toEqual([])
  })
})
