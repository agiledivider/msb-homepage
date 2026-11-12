/**
 * Fitness: the public frontend never queries editorial collections directly.
 *
 * Every read of blog / events / pages from src/app/(frontend) must go through
 * src/lib/publicData.ts (findPublic / findForRequest), which enforces
 * "published + approved, under access control". A direct `payload.find` defaults
 * to `overrideAccess: true` and leaks drafts (e.g. into generateMetadata).
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FRONTEND = path.resolve(import.meta.dirname, '../../src/app/(frontend)')

// Files allowed to talk to Payload directly, and why.
const ALLOWED: Record<string, string> = {
  // Auth check only (payload.auth) before enabling draft mode; reads no content.
  'next/preview/route.ts': 'auth gate for draft mode',
}

// Direct collection reads. findGlobal is not listed: globals carry no editorial workflow.
const FORBIDDEN = /\.\s*(find|findByID|findDistinct|count|findVersions|findVersionByID)\s*\(\s*\{/g

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(e.name) ? [full] : []
  })

describe('frontend data boundary (fitness)', () => {
  const files = sourceFiles(FRONTEND)

  it('finds the frontend sources', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(
    files.map((f) => [path.relative(FRONTEND, f), f]),
  )('%s reads collections only via publicData', (rel, full) => {
    if (rel in ALLOWED) return
    const src = readFileSync(full, 'utf8')
    const offending = [...src.matchAll(FORBIDDEN)].map(
      (m) => `line ${src.slice(0, m.index).split('\n').length}: ${m[0]}`,
    )
    expect(offending, `use findPublic/findForRequest from @/lib/publicData instead`).toEqual([])
  })
})
