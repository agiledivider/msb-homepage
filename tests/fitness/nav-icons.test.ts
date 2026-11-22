/**
 * Fitness: the admin sidebar icons in custom.scss are what scripts/nav-icons.ts
 * generates, so a new nav entry's icon is added there (pnpm nav-icons), not by
 * hand-pasting an SVG data URI.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAV_ICONS, withBlock } from '../../scripts/nav-icons'

const SCSS = path.resolve(import.meta.dirname, '../../src/app/(payload)/custom.scss')

describe('admin nav icons', () => {
  it('are up to date (run `pnpm nav-icons`)', () => {
    const scss = readFileSync(SCSS, 'utf8')
    expect(withBlock(scss)).toBe(scss)
  })

  it('cover the backups link and the KI-Zugänge collection', () => {
    const ids = NAV_ICONS.map(([id]) => id)
    expect(ids).toContain('nav-backups')
    expect(ids).toContain('nav-payload-mcp-api-keys')
  })
})
