/**
 * S4.6: the dark "Tannen" palette passes the same contrast checks as light
 * (styleguide 2026-11, src/build.py MODI_PRUEFEN: text 4.5:1, focus 3:1, the
 * graph-paper raster stays quiet at most 1.10:1), and both dark blocks in
 * globals.css (system setting / forced by the toggle) carry the same values.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyThemeMode, nextThemeMode, parseThemeMode, THEME_COLOR } from '../../src/lib/theme'

const css = readFileSync(path.resolve(import.meta.dirname, '../../src/styles/globals.css'), 'utf8')

const varsIn = (block: string) =>
  Object.fromEntries([...block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))

const blockAfter = (marker: string) => {
  const start = css.indexOf('{', css.indexOf(marker)) + 1
  return css.slice(start, css.indexOf('}', start))
}
const light = varsIn(blockAfter('@theme'))
const systemDark = varsIn(blockAfter(':root:not([data-theme="light"])'))
const forcedDark = varsIn(blockAfter(':root[data-theme="dark"]'))
const dark = { ...light, ...forcedDark }

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// role → surfaces it sits on, minimum ratio (our token names for the styleguide roles)
const PAIRS: Array<[string, string[], number]> = [
  ['ink', ['paper', 'raster', 'card', 'fond', 'green-pale', 'fond-gelb', 'mint'], 4.5],
  ['muted', ['paper', 'raster', 'card', 'fond', 'green-pale', 'mint'], 4.5],
  ['brand-text', ['paper', 'raster', 'card', 'fond', 'green-pale'], 4.5],
  ['link-hover', ['paper', 'card', 'fond'], 4.5],
  ['button-text', ['button', 'button-hover'], 4.5],
  ['text-gelb', ['paper', 'card', 'fond-gelb'], 4.5],
  ['tinte', ['brand', 'yellow', 'orange'], 4.5],
]

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s palette', (_, p) => {
  it.each(PAIRS)('%s is readable on its surfaces', (fg, surfaces, min) => {
    const failing = surfaces.filter((s) => ratio(p[fg], p[s]) < min).map((s) => `${s} ${ratio(p[fg], p[s]).toFixed(2)}`)
    expect(failing).toEqual([])
  })

  it('keeps the graph-paper raster quiet', () => {
    expect(ratio(p.raster, p.paper)).toBeLessThanOrEqual(1.1)
  })
})

describe('dark mode tokens', () => {
  it('system-dark and forced-dark blocks are identical', () => {
    expect(Object.keys(forcedDark).length).toBeGreaterThan(10)
    expect(systemDark).toEqual(forcedDark)
  })

  it('browser bar colours are the page backgrounds', () => {
    expect(THEME_COLOR.light).toBe(light.paper)
    expect(THEME_COLOR.dark).toBe(dark.paper)
  })
})

describe('theme toggle', () => {
  it('cycles Auto → Hell → Dunkel → Auto and ignores junk in storage', () => {
    expect([nextThemeMode('auto'), nextThemeMode('light'), nextThemeMode('dark')]).toEqual(['light', 'dark', 'auto'])
    expect(parseThemeMode('dark')).toBe('dark')
    expect(parseThemeMode('purple')).toBe('auto')
    expect(parseThemeMode(null)).toBe('auto')
  })

  it('sets data-theme and the browser bar colour, and clears them on auto', () => {
    const metas = [
      { media: '(prefers-color-scheme: light)', content: '' },
      { media: '(prefers-color-scheme: dark)', content: '' },
    ]
    const root = { dataset: {} as Record<string, string> }
    const doc = { documentElement: root, querySelectorAll: () => metas } as unknown as Document
    applyThemeMode('dark', doc)
    expect(root.dataset.theme).toBe('dark')
    expect(metas.map((m) => m.content)).toEqual([THEME_COLOR.dark, THEME_COLOR.dark])
    applyThemeMode('auto', doc)
    expect(root.dataset.theme).toBeUndefined()
    expect(metas.map((m) => m.content)).toEqual([THEME_COLOR.light, THEME_COLOR.dark])
  })
})
