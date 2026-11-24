/**
 * The styleguide KI label is drawn by the site over the image (any crop), from
 * the media's `aiLabel`, never baked into the file.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MapCard } from '@/components/MapCard'
import { Media } from '@/components/Media'

const img = (aiLabel?: 'none' | 'generated' | 'edited' | null) =>
  renderToStaticMarkup(
    createElement(Media, {
      resource: { url: '/api/media/file/x.jpg', alt: 'Lebkuchenhaus', width: 1920, height: 1072, aiLabel },
      className: 'h-[380px] w-full',
    }),
  )

describe('KI label on media', () => {
  it.each([
    ['generated', 'Bild generiert'],
    ['edited', 'Bild bearbeitet'],
  ] as const)('shows "KI · %s" over an AI image', (label, text) => {
    const html = img(label)
    expect(html).toContain('>KI<')
    expect(html).toContain(text)
  })

  it.each([['none'], [null], [undefined]] as const)('shows nothing for %s', (label) => {
    expect(img(label)).not.toContain('>KI<')
  })

  it('shows nothing on the empty placeholder', () => {
    const html = renderToStaticMarkup(createElement(Media, { resource: undefined, placeholder: 'Foto' }))
    expect(html).not.toContain('>KI<')
  })
})

describe('KI label on the location map (S4.5)', () => {
  it('marks the built-in map, which is an AI-edited OSM screenshot', () => {
    expect(renderToStaticMarkup(createElement(MapCard, {}))).toContain('Bild bearbeitet')
  })

  it("follows the editor's upload once one is set", () => {
    const map = { url: '/api/media/file/karte.jpg', alt: 'Karte', width: 1400, height: 939, aiLabel: 'none' as const }
    expect(renderToStaticMarkup(createElement(MapCard, { map }))).not.toContain('>KI<')
  })
})
