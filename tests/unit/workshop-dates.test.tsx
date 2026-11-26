/**
 * The "Nächste Termine" box on a workshop page (S10.2): it lists the linked
 * upcoming events, and with nothing planned it says so and points to the
 * Offene Tür instead of disappearing.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkshopPage } from '@/components/WorkshopPage'
import type { Event, Workshop } from '@/payload-types'

const aWorkshop = (overrides: Partial<Workshop> = {}): Workshop =>
  ({
    id: 1,
    title: '3D-Druck',
    slug: '3d-druck',
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  }) as Workshop

const anEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 7,
    title: 'Einweisung Prusa',
    slug: 'einweisung-prusa',
    date: '2026-12-03T17:00:00.000Z',
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  }) as Event

/** Inner HTML of the dates box, or undefined when the page shows none. */
const datesBox = (events: Event[]) => {
  const html = renderToStaticMarkup(
    createElement(WorkshopPage, { workshop: aWorkshop(), others: [], events, posts: [] }),
  )
  return /NÄCHSTE TERMINE<\/div>([\s\S]*?)<\/aside>/.exec(html)?.[1]
}

describe('workshop next dates', () => {
  it('lists linked upcoming events', () => {
    const box = datesBox([anEvent()])
    expect(box).toContain('Einweisung Prusa')
    expect(box).toContain('href="/events/einweisung-prusa"')
    expect(box).not.toContain('Gerade ist nichts geplant')
  })

  it('says nothing is planned and points to the Offene Tür', () => {
    const box = datesBox([])
    expect(box).toBeDefined()
    expect(box).toContain('Gerade ist nichts geplant')
    expect(box).toContain('Offene Tür')
    expect(box).toContain('href="/events"')
  })
})
