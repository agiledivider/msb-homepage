/**
 * Events have a subtitle: an italic line under the title on the event page,
 * in the start-page hero and in the lists (/events, archive, "Was läuft").
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ListView } from '@/components/events/ListView'
import { toEventVM } from '@/components/events/model'
import { TilesView } from '@/components/events/TilesView'
import { eventToFace } from '@/lib/mappers'
import type { Event } from '@/payload-types'

const anEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 1,
    title: 'Lebkuchenhaus bauen',
    slug: 'lebkuchenhaus',
    date: '2026-11-28T12:00:00.000Z',
    timeLabel: 'ab 14',
    updatedAt: '2026-11-22T12:00:00.000Z',
    createdAt: '2026-11-22T12:00:00.000Z',
    ...overrides,
  }) as Event

describe('event subtitle', () => {
  it('goes into the hero as the italic lede', () => {
    expect(eventToFace(anEvent({ subtitle: 'Honigkuchen und Zuckerguss' })).lede).toBe('Honigkuchen und Zuckerguss')
  })

  it.each([
    ['list', ListView],
    ['tiles', TilesView],
  ] as const)('shows under the title in the %s view', (_, View) => {
    const html = renderToStaticMarkup(
      createElement(View, { events: [toEventVM(anEvent({ subtitle: 'Honigkuchen und Zuckerguss' }))] }),
    )
    expect(html.indexOf('Honigkuchen und Zuckerguss')).toBeGreaterThan(html.indexOf('Lebkuchenhaus bauen'))
  })

  it('leaves no empty line when an event has none', () => {
    const html = renderToStaticMarkup(createElement(ListView, { events: [toEventVM(anEvent())] }))
    expect(html).not.toContain('font-serif')
  })
})
