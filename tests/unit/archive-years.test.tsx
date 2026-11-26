/**
 * The events archive, one page per year (S5.9), each row with its year (S5.16).
 * The newest year is /events/archiv; years count in Berlin time.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { YearNav } from '@/components/events/EventsArchive'
import { ListView } from '@/components/events/ListView'
import { toEventVM } from '@/components/events/model'
import { archiveYearPath, archiveYears, berlinYear, berlinYearRange, parseArchiveYear } from '@/lib/archiveYears'
import type { Event } from '@/payload-types'

let nextId = 1
const anEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: nextId++,
    title: 'Repair-Café',
    slug: `repair-cafe-${nextId}`,
    date: '2019-12-05T17:00:00.000Z',
    updatedAt: '2026-11-22T12:00:00.000Z',
    createdAt: '2026-11-22T12:00:00.000Z',
    ...overrides,
  }) as Event

const vm = (date: string) => toEventVM(anEvent({ date }))

describe('archive years', () => {
  it('lists each year once, newest first', () => {
    const dates = ['2019-12-05T17:00:00Z', '2025-03-01T10:00:00Z', '2025-01-10T10:00:00Z', '2022-06-01T10:00:00Z']
    expect(archiveYears(dates.map((d) => new Date(d)))).toEqual([2025, 2022, 2019])
  })

  it('counts the year in Berlin time, not UTC', () => {
    // 23:30 UTC on New Year's Eve is already 00:30 on 1 January in Bonn.
    expect(berlinYear(new Date('2024-12-31T23:30:00Z'))).toBe(2025)
    const { start, end } = berlinYearRange(2025)
    expect(start.toISOString()).toBe('2024-12-31T23:00:00.000Z')
    expect(end.toISOString()).toBe('2025-12-31T23:00:00.000Z')
  })

  it('puts the newest year on the archive itself and older years on their own address', () => {
    expect(archiveYearPath(2026, 2026)).toBe('/events/archiv')
    expect(archiveYearPath(2019, 2026)).toBe('/events/archiv/2019')
  })

  it.each([
    ['2019', 2019],
    ['2026', 2026],
    ['19', null],
    ['2019a', null],
    ['seite', null],
    ['3019', null],
  ])('reads %s from the address as %s', (raw, year) => {
    expect(parseArchiveYear(raw)).toBe(year)
  })

  it('links every other year and marks the one shown', () => {
    const html = renderToStaticMarkup(
      createElement(YearNav, { years: [2026, 2025, 2019], current: 2025, newest: 2026 }),
    )
    expect(html).toContain('href="/events/archiv"')
    expect(html).toContain('href="/events/archiv/2019"')
    expect(html).not.toContain('href="/events/archiv/2025"')
    expect(html).toMatch(/aria-current="page"[^>]*>2025</)
  })

  it('shows the year on every archive row', () => {
    const html = renderToStaticMarkup(
      createElement(ListView, { events: [vm('2019-12-05T17:00:00.000Z')], showYear: true }),
    )
    expect(html).toContain('2019')
  })

  it('leaves the upcoming list without a year', () => {
    const html = renderToStaticMarkup(createElement(ListView, { events: [vm('2019-12-05T17:00:00.000Z')] }))
    expect(html).not.toContain('2019')
  })
})
