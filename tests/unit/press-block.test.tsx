/**
 * S3.4: /verein lists the press coverage newest first (outlet, date, link) and
 * names a press contact.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type PressBlock, PressComponent } from '@/blocks/Press/Component'

const render = (overrides: Partial<PressBlock> = {}) =>
  renderToStaticMarkup(
    createElement(PressComponent, {
      blockType: 'press',
      heading: 'Wir in den Medien',
      items: [
        {
          outlet: 'General-Anzeiger Bonn',
          title: 'Ein älterer Bericht',
          date: '2018-03-05T00:00:00.000Z',
          url: 'https://ga.de/alt',
        },
        {
          outlet: 'General-Anzeiger Bonn',
          title: 'Der neueste Bericht',
          date: '2021-02-04T00:00:00.000Z',
          url: 'https://ga.de/neu',
        },
        {
          outlet: 'MakerSpace Bonn e.V.',
          title: 'Pressemitteilung zur Eröffnung',
          date: '2018-02-13T00:00:00.000Z',
          document: { url: '/api/media/file/pm.pdf', filename: 'pm.pdf', mimeType: 'application/pdf' },
        },
      ],
      contactEmail: 'presse@example.org',
      ...overrides,
    }),
  )

describe('Press block', () => {
  it('lists the coverage newest first', () => {
    const html = render()
    const order = ['Der neueste Bericht', 'Ein älterer Bericht', 'Pressemitteilung zur Eröffnung'].map((t) =>
      html.indexOf(t),
    )
    expect(order.every((i) => i > 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('shows outlet and German date for each item', () => {
    const html = render()
    expect(html).toContain('General-Anzeiger Bonn')
    expect(html).toContain('04.02.2021')
    expect(html).toContain('13.02.2018')
  })

  it('opens external articles in a new tab, safely', () => {
    const html = render()
    expect(html).toContain('href="https://ga.de/neu"')
    expect(html).toMatch(/href="https:\/\/ga\.de\/neu"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
  })

  it('links an uploaded document and marks it as PDF', () => {
    const html = render()
    expect(html).toContain('href="/api/media/file/pm.pdf"')
    expect(html).toContain('PDF')
  })

  it('names the press contact with a mail link', () => {
    expect(render()).toContain('href="mailto:presse@example.org"')
  })

  it('leaves out an item without a link', () => {
    const html = render({ items: [{ outlet: 'X', title: 'Ohne Link', date: '2020-01-01T00:00:00.000Z' }] })
    expect(html).not.toContain('Ohne Link')
  })

  it('renders nothing without items', () => {
    expect(render({ items: [] })).toBe('')
  })
})
