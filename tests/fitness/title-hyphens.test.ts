/**
 * Fitness: big titles break long German words at a syllable (S4.10).
 *
 * A page title (`font-display` + `font-black` + `break-words`) without
 * hyphenation cuts a long word anywhere at the screen edge, leaving one or two
 * letters alone on a line at 360–375 px ("Demystifizierun / g"). Every such
 * class string must also carry `hyphens-auto` and the shared limit (words of
 * 10+ letters, 4+ letters on each side of the hyphen), so short words like
 * "Werkstatt" stay whole. `break-words` stays as the fallback for browsers
 * without a German dictionary.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../src')
const DIRS = ['app/(frontend)', 'blocks', 'components'].map((d) => path.join(ROOT, d))

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(full)
    return /\.tsx$/.test(e.name) ? [full] : []
  })

const titleClassStrings = () =>
  DIRS.flatMap(sourceFiles).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/['"`]([^'"`]*\bfont-display\b[^'"`]*)['"`]/g)]
      .map((m) => m[1])
      .filter((cls) => /\bfont-black\b/.test(cls) && /\bbreak-words\b/.test(cls))
      .map((cls) => ({ file: path.relative(ROOT, file), cls })),
  )

describe('page titles hyphenate long words', () => {
  it('finds the page titles', () => {
    expect(titleClassStrings().length).toBeGreaterThanOrEqual(3)
  })

  it.each(titleClassStrings())('$file', ({ cls }) => {
    expect(cls).toContain('hyphens-auto')
    expect(cls).toContain('[hyphenate-limit-chars:10_4_4]')
  })
})
