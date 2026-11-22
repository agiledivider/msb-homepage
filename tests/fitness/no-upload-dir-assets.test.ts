/**
 * Fitness: code never points at a fixed file in the upload directory.
 *
 * `public/media` is Payload's upload dir: gitignored, excluded from the Docker
 * image and a volume in production. A file a component expects there exists only
 * on the machine that put it there, so production serves a 404 (the fallback map
 * on /mitmachen, 2026-11-22). Fixed site images go in a committed folder such as
 * `public/brand`; uploads are referenced through their media document.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../src')
// Seeds create upload documents on purpose; migrations are generated.
const EXCLUDED = ['seed', 'migrations'].map((d) => path.join(ROOT, d))

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (EXCLUDED.some((x) => full.startsWith(x))) return []
    if (e.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(e.name) ? [full] : []
  })

// A string literal that starts with /media/ or /api/media/file/ and names a file.
const UPLOAD_PATH = /['"`]\/(?:api\/media\/file|media)\/[^'"`\s]+\.[a-z0-9]+['"`]/gi

describe('no fixed assets in the upload dir (fitness)', () => {
  const files = sourceFiles(ROOT)

  it('finds the sources', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s references no file in public/media', (_rel, full) => {
    const src = readFileSync(full, 'utf8')
    const offending = [...src.matchAll(UPLOAD_PATH)].map(
      (m) => `line ${src.slice(0, m.index).split('\n').length}: ${m[0]}`,
    )
    expect(offending, 'put fixed site images in public/brand (committed), not the upload dir').toEqual([])
  })
})
