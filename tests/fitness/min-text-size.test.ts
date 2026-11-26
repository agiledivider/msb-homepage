/**
 * Fitness: public-site text is never smaller than 14px.
 *
 * Styleguide 2026-11 §9: "Web: nie unter 14 px". Checks the Tailwind size
 * utilities in the frontend sources: arbitrary sizes like `text-[12.5px]` below
 * 14px, and the built-in `text-xs` (12px). Inline styles aren't used for font
 * sizes in this codebase, so they aren't scanned.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../src')
const DIRS = ['app/(frontend)', 'blocks', 'components'].map((d) => path.join(ROOT, d))

// Admin-only UI renders inside Payload, not on the public site.
const EXCLUDED = [path.join(ROOT, 'components/admin')]

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (EXCLUDED.some((x) => full.startsWith(x))) return []
    if (e.isDirectory()) return sourceFiles(full)
    return /\.tsx$/.test(e.name) ? [full] : []
  })

/**
 * Deliberate exceptions, per file and exact utility. Hero on phones (Falk
 * 2026-11-22): the mobile hero is tuned below the styleguide minimum so the
 * whole face fits on small screens: eyebrow pill 11px, event date 12px, CTA
 * labels 13px. Anything else below 14px in these files still fails.
 */
const ALLOWED: Record<string, string[]> = {
  'blocks/Hero/Component.tsx': ['text-[11px]', 'text-[12px]', 'text-[13px]'],
  // Mitglieder-Fahne (S5.15): a 12 px bold label on Mitglieder-Gelb, Falk 2026-11-26.
  'components/events/MembersOnlyBadge.tsx': ['text-[12px]'],
}

const TOO_SMALL = /(?<![\w-])text-(?:\[(\d+(?:\.\d+)?)px\]|xs)(?![\w-])/g

describe('minimum text size (fitness)', () => {
  const files = DIRS.flatMap(sourceFiles)

  it('finds the frontend sources', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s has no text below 14px', (rel, full) => {
    const src = readFileSync(full, 'utf8')
    const allowed = ALLOWED[rel] ?? []
    const offending = [...src.matchAll(TOO_SMALL)]
      .filter((m) => m[1] === undefined || Number(m[1]) < 14)
      .filter((m) => !allowed.includes(m[0]))
      .map((m) => `line ${src.slice(0, m.index).split('\n').length}: ${m[0]}`)
    expect(offending, 'styleguide §9: web text is never below 14px').toEqual([])
  })
})
