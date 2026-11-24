/**
 * Fitness (S1.7): the site and CMS icons in public/ are what scripts/icons.ts
 * renders from the signet (pnpm icons), and the web manifest only points at
 * icons that exist in the sizes it claims.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { MANIFEST, renderIcons } from '../../scripts/icons'

const PUBLIC = path.resolve(import.meta.dirname, '../../public')

describe('site icons (fitness)', () => {
  it('are up to date (run `pnpm icons`)', async () => {
    const files = await renderIcons()
    const stale = Object.entries(files)
      .filter(([rel, data]) => {
        try {
          return !readFileSync(path.join(PUBLIC, rel)).equals(data)
        } catch {
          return true
        }
      })
      .map(([rel]) => rel)
    expect(stale).toEqual([])
  })

  it('manifest icons exist in the sizes they claim', async () => {
    for (const icon of MANIFEST.icons) {
      const meta = await sharp(path.join(PUBLIC, icon.src)).metadata()
      expect(`${meta.width}x${meta.height}`, icon.src).toBe(icon.sizes)
    }
  })
})
