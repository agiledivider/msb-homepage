/**
 * The quick-facts strip on a workshop page has as many columns as facts, so a
 * strip with three facts shows no empty fourth cell (reported 2026-11-26).
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkshopPage } from '@/components/WorkshopPage'
import type { Workshop } from '@/payload-types'

const aWorkshop = (overrides: Partial<Workshop> = {}): Workshop =>
  ({
    id: 1,
    title: '3D-Druck',
    slug: '3d-druck',
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  }) as Workshop

/** Class list of the facts <dl>, or undefined when the page shows none. */
const factsClasses = (w: Workshop) => {
  const html = renderToStaticMarkup(createElement(WorkshopPage, { workshop: w, others: [], events: [], posts: [] }))
  return /<dl class="([^"]*grid[^"]*)"/.exec(html)?.[1].split(' ')
}

const cols = (cls: string[] | undefined) => cls?.filter((c) => c.includes('grid-cols-')).sort()

describe('workshop quick facts', () => {
  it.each([
    [1, { where: '1. Etage' }, {}, []],
    [2, { where: '1. Etage', hours: 'Immer' }, {}, ['sm:grid-cols-2']],
    [3, { where: '1. Etage', hours: 'Immer', cost: 'Pro Gramm' }, {}, ['sm:grid-cols-3']],
    [
      4,
      { where: '1. Etage', hours: 'Immer', cost: 'Pro Gramm' },
      { name: 'Erika' },
      ['lg:grid-cols-4', 'sm:grid-cols-2'],
    ],
  ])('%i facts → columns %j', (_n, facts, contact, expected) => {
    expect(cols(factsClasses(aWorkshop({ facts, contact })))).toEqual(expected)
  })

  it('shows no strip without facts', () => {
    expect(factsClasses(aWorkshop())).toBeUndefined()
  })
})
