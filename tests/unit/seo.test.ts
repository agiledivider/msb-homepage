/** S1.1: content pages take their search/preview description from the intro lede. */
import { describe, expect, it } from 'vitest'
import { pageDescription, pagePath } from '../../src/lib/seo'
import type { Page } from '../../src/payload-types'

const intro = (lede: string | null) => [{ blockType: 'pageIntro', headline: 'H', lede }] as Page['layout']

describe('pageDescription', () => {
  it('uses the first intro lede, whitespace collapsed', () => {
    expect(pageDescription(intro('  Wir sind\n ein Verein. '))).toBe('Wir sind ein Verein.')
  })

  it.each([
    ['no layout', null],
    ['no intro', [{ blockType: 'prose' }] as unknown as Page['layout']],
    ['empty lede', intro('   ')],
  ])('is undefined with %s, so the site default applies', (_, layout) => {
    expect(pageDescription(layout)).toBeUndefined()
  })

  it('cuts long ledes at a word boundary within 160 characters', () => {
    const d = pageDescription(intro('Werkstatt '.repeat(30))) ?? ''
    expect(d.length).toBeLessThanOrEqual(160)
    expect(d).toMatch(/Werkstatt…$/)
  })
})

describe('pagePath', () => {
  it('maps the home page to / and others to /slug', () => {
    expect(pagePath('home')).toBe('/')
    expect(pagePath('verein')).toBe('/verein')
  })
})
