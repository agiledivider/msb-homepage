/**
 * S5.16: the events archive shows which year each event took place and where
 * one year ends and the next begins. The upcoming list stays as it is.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ListView } from '@/components/events/ListView'
import { groupByYear, toEventVM } from '@/components/events/model'
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

const vm = (date: string, title = 'Repair-Café') => toEventVM(anEvent({ date, title }))

describe('archive years', () => {
  it('groups events by year and keeps their order', () => {
    const groups = groupByYear([
      vm('2025-03-01T10:00:00.000Z', 'C'),
      vm('2025-01-10T10:00:00.000Z', 'B'),
      vm('2019-12-05T17:00:00.000Z', 'A'),
    ])
    expect(groups.map((g) => [g.year, g.events.map((e) => e.title)])).toEqual([
      ['2025', ['C', 'B']],
      ['2019', ['A']],
    ])
  })

  it('counts the year in Berlin time, not UTC', () => {
    // 23:30 UTC on New Year's Eve is already 00:30 on 1 January in Bonn.
    const [group] = groupByYear([vm('2024-12-31T23:30:00.000Z')])
    expect(group.year).toBe('2025')
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
