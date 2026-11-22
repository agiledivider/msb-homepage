/**
 * Fitness: Archivo (`font-display`) is only used from 24 to 56px.
 *
 * Styleguide 2026-11.10 §9: Archivo for titles (40–56px) and headings
 * (24–32px), never below 24px; below that, IBM Plex Sans Bold. Checks every
 * class string that sets `font-display`: its sizes (`text-[Npx]`, the minimum of
 * a `text-[clamp(…)]`, any `md:` etc. variant) must lie in 24–56px. Selector
 * classes like `[&_h2]:font-display` are checked against `[&_h2]:text-[…]`.
 * Sizes set elsewhere (e.g. via a helper like the hero's headlineSize) have
 * their own unit test.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../src')
const DIRS = ['app/(frontend)', 'blocks', 'components'].map((d) => path.join(ROOT, d))
const EXCLUDED = [path.join(ROOT, 'components/admin')]

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (EXCLUDED.some((x) => full.startsWith(x))) return []
    if (e.isDirectory()) return sourceFiles(full)
    return /\.tsx$/.test(e.name) ? [full] : []
  })

// Class strings: '…', "…", `…` (template literals checked as a whole).
const STRINGS = /'[^'\n]*'|"[^"\n]*"|`[^`]*`/g
// Optional arbitrary-selector prefix like `[&_h2]:`, then font-display.
const DISPLAY = /(\[&_[a-z0-9]+\]:)?font-display(?![\w-])/g

function sizesFor(cls: string, selector: string): number[] {
  const esc = selector.replace(/[[\]&]/g, '\\$&')
  const re = new RegExp(`(?:^|[\\s'"\`{(])(?:[a-z-]+:)*${esc}text-\\[(clamp\\(([0-9.]+)px[^\\]]*\\)|([0-9.]+)px)\\]`, 'g')
  return [...cls.matchAll(re)].map((m) => Number(m[2] ?? m[3]))
}

describe('Archivo size range (fitness)', () => {
  const files = DIRS.flatMap(sourceFiles)

  it('finds Archivo usages to check', () => {
    const n = files.reduce((acc, f) => acc + [...readFileSync(f, 'utf8').matchAll(DISPLAY)].length, 0)
    expect(n).toBeGreaterThan(5)
  })

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s sets Archivo only at 24–56px', (_rel, full) => {
    const src = readFileSync(full, 'utf8')
    const offending: string[] = []
    for (const m of src.matchAll(STRINGS)) {
      const cls = m[0]
      for (const d of cls.matchAll(DISPLAY)) {
        for (const px of sizesFor(cls, d[1] ?? '')) {
          if (px < 24 || px > 56)
            offending.push(`line ${src.slice(0, m.index).split('\n').length}: ${d[0]} at ${px}px`)
        }
      }
    }
    expect(offending, 'below 24px use font-sans font-bold (styleguide §9)').toEqual([])
  })
})
