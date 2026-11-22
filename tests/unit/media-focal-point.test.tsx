/**
 * S5.7: every crop of an image is framed around the focal point editors set
 * in the CMS (Payload's `focalX` / `focalY`, percent of width / height).
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Media, type MediaResource } from '@/components/Media'

const aMedia = (overrides: Partial<Exclude<MediaResource, string | null | undefined>> = {}) => ({
  url: '/api/media/file/werkstatt.jpg',
  alt: 'Werkstatt',
  width: 1920,
  height: 1080,
  ...overrides,
})

const render = (resource: MediaResource) =>
  renderToStaticMarkup(createElement(Media, { resource, className: 'h-[380px] w-full' }))

const imgTag = (html: string) => html.match(/<img[^>]*>/)?.[0] ?? ''

describe('Media focal point', () => {
  it('frames the crop around the focal point', () => {
    expect(imgTag(render(aMedia({ focalX: 20, focalY: 75 })))).toContain('object-position:20% 75%')
  })

  it.each([
    ['no focal point', {}],
    ['null focal point', { focalX: null, focalY: null }],
    ['only one coordinate', { focalX: 30 }],
  ] as const)('keeps the default centre crop with %s', (_, overrides) => {
    expect(imgTag(render(aMedia(overrides)))).not.toContain('object-position')
  })

  it('keeps values from outside 0–100 inside the image', () => {
    expect(imgTag(render(aMedia({ focalX: -10, focalY: 140 })))).toContain('object-position:0% 100%')
  })

  it('keeps the KI label on the frame, not the shifted image', () => {
    const html = render(aMedia({ focalX: 0, focalY: 0, aiLabel: 'generated' }))
    expect(html).toContain('Bild generiert')
    expect(html.indexOf('Bild generiert')).toBeGreaterThan(html.indexOf('<img'))
  })
})
