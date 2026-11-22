/**
 * /verein from general blocks (2026-11-22): the old "Verein Intro" becomes
 * Zwei Spalten (explainer, text, quote | timeline) + Werte, and the new blocks
 * render like the old one did.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type ColumnsBlock, ColumnsComponent } from '@/blocks/Columns/Component'
import { SPLITS } from '@/blocks/Columns/config'
import { QuoteComponent } from '@/blocks/Quote/Component'
import { TimelineComponent } from '@/blocks/Timeline/Component'
import { ValuesComponent } from '@/blocks/Values/Component'
import { doc, p, t } from '@/seed/lexical'
import { convertLayout, VEREIN_EXPLAINER, vereinIntroToBlocks } from '@/seed/vereinLayout'

const body = doc([p(t('Bei uns findet eine Community zusammen.'))])
const intro = {
  body,
  quote: 'Bonn hat mit uns eine offene Werkstatt.',
  timelineTitle: 'DIE KURZE GESCHICHTE',
  timeline: [
    { id: 'old-1', year: '2017', text: 'Gründung.' },
    { id: 'old-2', year: '2018', text: 'Eröffnung.' },
  ],
  values: [{ id: 'old-3', title: 'Für alle', text: 'Jede:r ist willkommen.' }],
}

describe('vereinIntroToBlocks', () => {
  it('puts explainer, text and quote left, the timeline right, 3:2, then the values', () => {
    expect(vereinIntroToBlocks(intro)).toEqual([
      {
        blockType: 'columns',
        split: '3-2',
        left: [
          { blockType: 'prose', body: VEREIN_EXPLAINER },
          { blockType: 'prose', body },
          { blockType: 'quote', text: 'Bonn hat mit uns eine offene Werkstatt.' },
        ],
        right: [
          {
            blockType: 'timeline',
            title: 'DIE KURZE GESCHICHTE',
            items: [
              { year: '2017', text: 'Gründung.' },
              { year: '2018', text: 'Eröffnung.' },
            ],
          },
        ],
      },
      { blockType: 'values', items: [{ title: 'Für alle', text: 'Jede:r ist willkommen.' }] },
    ])
  })

  it('leaves out what the intro did not have', () => {
    expect(vereinIntroToBlocks({})).toEqual([
      { blockType: 'columns', split: '3-2', left: [{ blockType: 'prose', body: VEREIN_EXPLAINER }], right: [] },
    ])
  })
})

describe('convertLayout', () => {
  type B = { blockType: string; left?: B[] }
  const kinds = (layout: object[]) => (layout as B[]).map((b) => b.blockType)
  const leftOf = (layout: object[]) =>
    ((layout as B[]).find((b) => b.blockType === 'columns')?.left ?? []).map((b) => b.blockType)

  it('replaces the Verein Intro in place and moves Menschen to the end of the left column', () => {
    const { layout, changed } = convertLayout([
      { blockType: 'pageIntro' },
      { blockType: 'vereinIntro', ...intro },
      { blockType: 'people', heading: 'Menschen & Ansprechpartner' },
      { blockType: 'press' },
    ])
    expect(changed).toBe(true)
    expect(kinds(layout)).toEqual(['pageIntro', 'columns', 'values', 'press'])
    expect(leftOf(layout)).toEqual(['prose', 'prose', 'quote', 'people'])
  })

  it('moves Menschen into an already converted page', () => {
    const { layout, changed } = convertLayout([
      { blockType: 'columns', left: [{ blockType: 'prose' }], right: [] },
      { blockType: 'people' },
    ])
    expect(changed).toBe(true)
    expect(kinds(layout)).toEqual(['columns'])
    expect(leftOf(layout)).toEqual(['prose', 'people'])
  })

  it('changes nothing on a page that is already done (idempotent)', () => {
    const page = [{ blockType: 'pageIntro' }, { blockType: 'columns', left: [{ blockType: 'people' }] }]
    expect(convertLayout(page)).toEqual({ layout: page, changed: false })
  })

  it('leaves Menschen alone on a page without columns', () => {
    const page = [{ blockType: 'pageIntro' }, { blockType: 'people' }]
    expect(convertLayout(page)).toEqual({ layout: page, changed: false })
  })
})

describe('Zwei Spalten', () => {
  const columns = (split: ColumnsBlock['split']) =>
    renderToStaticMarkup(
      createElement(ColumnsComponent, {
        blockType: 'columns',
        split,
        left: [{ blockType: 'quote', text: 'Links' }],
        right: [{ blockType: 'timeline', title: 'RECHTS', items: [{ year: '2017', text: 'x' }] }],
      }),
    )

  it.each(SPLITS.map((s) => s.value))('has a grid for split %s', (split) => {
    expect(columns(split)).toMatch(/lg:grid-cols-(2|\[\dfr_\dfr\])/)
  })

  it('renders the left column before the right one (that order on phones)', () => {
    const html = columns('3-2')
    expect(html.indexOf('Links')).toBeLessThan(html.indexOf('RECHTS'))
  })

  it('falls back to 3:2 for an unknown split', () => {
    expect(columns('9-9' as never)).toContain('lg:grid-cols-[3fr_2fr]')
  })
})

describe('content blocks', () => {
  it('Zitat adds German quotation marks', () => {
    expect(renderToStaticMarkup(createElement(QuoteComponent, { blockType: 'quote', text: 'Machen!' }))).toContain(
      '„Machen!“',
    )
  })

  it('Zeitleiste shows title, years and texts', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineComponent, { blockType: 'timeline', title: 'DIE KURZE GESCHICHTE', items: intro.timeline }),
    )
    for (const text of ['DIE KURZE GESCHICHTE', '2017', 'Eröffnung.']) expect(html).toContain(text)
  })

  it('Werte shows each card', () => {
    const html = renderToStaticMarkup(createElement(ValuesComponent, { blockType: 'values', items: intro.values }))
    expect(html).toContain('Für alle')
  })

  it.each([
    ['Zitat', () => createElement(QuoteComponent, { blockType: 'quote', text: '' })],
    ['Zeitleiste', () => createElement(TimelineComponent, { blockType: 'timeline', items: [] })],
    ['Werte', () => createElement(ValuesComponent, { blockType: 'values', items: [] })],
    ['Zwei Spalten', () => createElement(ColumnsComponent, { blockType: 'columns', left: [], right: [] })],
  ])('%s renders nothing when empty', (_label, el) => {
    expect(renderToStaticMarkup(el())).toBe('')
  })
})
