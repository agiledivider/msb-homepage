/**
 * Fitness: public-site colours come from the palette tokens only.
 *
 * Styleguide 2026-11: every colour is a named palette value, fixed, without
 * transparency. The tokens live in `@theme` in src/styles/globals.css; components
 * use them as utilities (`bg-card`, `text-muted`) or `var(--color-…)`.
 *
 * - No hex colour literals in frontend components.
 * - `rgb()/rgba()/hsl()` only inside shadows (`shadow-[…]`, `drop-shadow-[…]`),
 *   which are effects, not palette colours, or in the allowlist below.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../src')
const DIRS = ['app/(frontend)', 'blocks', 'components'].map((d) => path.join(ROOT, d))
const EXCLUDED = [path.join(ROOT, 'components/admin')] // Payload admin UI, not the public site

// Translucent colours that are a deliberate material effect, and why.
const ALLOWED_TRANSLUCENT: Record<string, string> = {
  'components/Polaroid.tsx': 'the tape strips are see-through on purpose',
  'blocks/Workshops/Component.tsx': 'pegboard holes (styleguide gap 5, pending adopt-or-drop)',
}

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (EXCLUDED.some((x) => full.startsWith(x))) return []
    if (e.isDirectory()) return sourceFiles(full)
    return /\.tsx$/.test(e.name) ? [full] : []
  })

const HEX = /#[0-9a-fA-F]{3,8}(?![\w-])/g
const FUNC_COLOUR = /(?:rgba?|hsla?)\([^)]*\)/g
// Shadow utilities, possibly with a variant prefix: everything up to the closing bracket.
const SHADOW = /(?:drop-)?shadow-\[[^\]]*\]/g

const lineOf = (src: string, index: number) => src.slice(0, index).split('\n').length

describe('palette colours only (fitness)', () => {
  const files = DIRS.flatMap(sourceFiles)

  it('finds the frontend sources', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s uses palette tokens for colours', (rel, full) => {
    const src = readFileSync(full, 'utf8')
    const hexes = [...src.matchAll(HEX)].map((m) => `line ${lineOf(src, m.index)}: ${m[0]}`)
    const funcs =
      rel in ALLOWED_TRANSLUCENT
        ? []
        : [...src.replace(SHADOW, (s) => ' '.repeat(s.length)).matchAll(FUNC_COLOUR)].map(
            (m) => `line ${lineOf(src, m.index)}: ${m[0]}`,
          )
    expect([...hexes, ...funcs], 'use a token from @theme in src/styles/globals.css').toEqual([])
  })
})
