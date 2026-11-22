/**
 * The imported Joomla archive (2026-11-22): every old article id lands
 * somewhere, the generated redirect map matches the archive, and the data the
 * seed relies on is consistent.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import archivePaths from '@/lib/legacy-paths.json'
import { resolveLegacyPath } from '@/lib/legacyRedirects'
import { legacyArchive } from '@/seed/legacy-archive'
import { legacyArticles } from '@/seed/legacy-articles'

const all = [...legacyArticles, ...legacyArchive]
const pathOf = (a: (typeof all)[number]) => `/${a.kind === 'blog' ? 'blog' : 'events'}/${a.slug}`
const oldUrl = (id: number) => new URL(`https://makerspacebonn.de/index.php?view=article&id=${id}:alias&catid=10`)

describe('legacy archive', () => {
  it('has no old id twice and no slug twice per collection', () => {
    const ids = all.map((a) => a.legacyId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const kind of ['blog', 'event'] as const) {
      const slugs = all.filter((a) => a.kind === kind).map((a) => a.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('redirects every archived article to its new page', () => {
    for (const a of legacyArchive) {
      expect((archivePaths as Record<string, string>)[String(a.legacyId)]).toBe(pathOf(a))
      expect(resolveLegacyPath(oldUrl(a.legacyId))).toBe(pathOf(a))
    }
  })

  it('lets hand-migrated articles win over the generated map', () => {
    for (const a of legacyArticles) expect(resolveLegacyPath(oldUrl(a.legacyId))).toBe(pathOf(a))
  })

  it('sends old pages that were not imported somewhere sensible', () => {
    expect(resolveLegacyPath(oldUrl(25))).toBe('/blog') // "Pfingstmontag geschlossen!"
    expect(resolveLegacyPath(oldUrl(152))).toBe('/datenschutz')
    expect(resolveLegacyPath(oldUrl(249))).toBe('/mitmachen')
  })

  it('points only at image files that are in the repo', () => {
    const dir = path.resolve(process.cwd(), 'uploads', 'legacy')
    const files = legacyArchive.flatMap((a) => [
      ...(a.image ? [a.image] : []),
      ...a.body.flatMap((b) => ('img' in b ? [b.img] : [])),
    ])
    expect(files.length).toBeGreaterThan(100)
    expect(files.filter((f) => !existsSync(path.join(dir, f)))).toEqual([])
  })

  it('never ends an event before it starts', () => {
    for (const a of legacyArchive) {
      if (a.kind === 'event' && a.endDate) expect(Date.parse(a.endDate)).toBeGreaterThanOrEqual(Date.parse(a.date))
    }
  })
})
