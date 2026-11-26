/**
 * S5.23: the map card keeps its link row's z-index to itself. Without its own
 * stacking context the row (z-20) ties with the sticky header (z-20); WebKit
 * then paints the later map over the header, and on an iPhone a tap on the
 * search button opened the map instead.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MapCard } from '@/components/MapCard'

describe('map card stacking', () => {
  it.each(['text', 'icons'] as const)('isolates its layers (%s links)', (links) => {
    const html = renderToStaticMarkup(createElement(MapCard, { links }))
    const root = /<div data-location-map="[^"]*" class="([^"]*)"/.exec(html)?.[1] ?? ''
    expect(root.split(' ')).toContain('isolate')
  })
})
