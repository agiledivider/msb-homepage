/**
 * S3.3: /verein lets visitors open the Verein's documents (Satzung, Ordnungen,
 * Gemeinnützigkeit), each with its date or version.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type DocumentsBlock, DocumentsComponent } from '@/blocks/Documents/Component'

const pdf = (name: string) => ({ url: `/api/media/file/${name}`, filename: name, mimeType: 'application/pdf' })

const render = (overrides: Partial<DocumentsBlock> = {}) =>
  renderToStaticMarkup(
    createElement(DocumentsComponent, {
      blockType: 'documents',
      heading: 'Satzung & Ordnungen',
      items: [
        { title: 'Satzung', version: 'Stand: Oktober 2017', document: pdf('satzung.pdf') },
        { title: 'Beitragsordnung', version: 'beschlossen am 17.06.2023', document: pdf('beitragsordnung.pdf') },
      ],
      ...overrides,
    }),
  )

describe('Documents block', () => {
  it('links each document to its file, in the editor’s order', () => {
    const html = render()
    expect(html).toContain('href="/api/media/file/satzung.pdf"')
    expect(html).toContain('href="/api/media/file/beitragsordnung.pdf"')
    expect(html.indexOf('Satzung<')).toBeLessThan(html.indexOf('Beitragsordnung<'))
  })

  it('shows the version of each document and marks PDFs', () => {
    const html = render()
    expect(html).toContain('Stand: Oktober 2017')
    expect(html).toContain('beschlossen am 17.06.2023')
    expect(html.match(/>PDF</g)).toHaveLength(2)
  })

  it('leaves out an item whose file is missing (e.g. deleted from the media library)', () => {
    const html = render({ items: [{ title: 'Gemeinnützigkeit', version: '2024', document: 7 }] })
    expect(html).toBe('')
  })

  it('renders nothing without documents', () => {
    expect(render({ items: [] })).toBe('')
  })
})
