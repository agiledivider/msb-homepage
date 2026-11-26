import { DatabaseSync } from 'node:sqlite'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MembersOnlyBadge } from '@/components/events/MembersOnlyBadge'
import { toEventVM } from '@/components/events/model'
import { eventsToList, eventToFace } from '@/lib/mappers'
import { labelBesideMarker } from '@/lib/membersOnly'
import { BACKFILL } from '@/migrations/20261126_022737_events_members_only'
import type { Event } from '@/payload-types'

const anEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 1,
    title: 'Monatliches Mitgliedertreffen',
    slug: 'mitgliedertreffen-2026-12-15',
    date: '2026-12-15T12:00:00.000Z',
    timeLabel: '18–21',
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  }) as Event

describe('hero face (start page)', () => {
  it('invites to membership instead of the event on members-only events', () => {
    const face = eventToFace(anEvent({ membersOnly: true }))
    expect(face.membersOnly).toBe(true) // yellow flag, sticker, tape (design B)
    expect(face.note).toBeUndefined()
    expect(face.primaryStyle).toBe('yellow')
    expect(face.primary).toEqual({ label: 'Mitglied werden', url: '/mitmachen' })
    expect(JSON.stringify(face)).not.toMatch(/kostenlos|Platz sichern/)
  })

  it('keeps the public invitation for everyone else', () => {
    const face = eventToFace(anEvent({ membersOnly: false }))
    expect(face.note).toBe('kostenlos ✦')
    expect(face.membersOnly).toBe(false)
    expect(face.primary?.label).toBe('Platz sichern')
  })
})

describe('members-only marker', () => {
  it('reaches the /events views and the workshop sidebar', () => {
    expect(toEventVM(anEvent({ membersOnly: true })).membersOnly).toBe(true)
    expect(toEventVM(anEvent({ membersOnly: null })).membersOnly).toBe(false)
    expect(eventsToList([anEvent({ membersOnly: true })])[0].membersOnly).toBe(true)
  })

  it('says the words, also in the icon-only form for screen readers', () => {
    expect(renderToStaticMarkup(<MembersOnlyBadge />)).toContain('Nur für Mitglieder')
    expect(renderToStaticMarkup(<MembersOnlyBadge compact />)).toContain('Nur für Mitglieder')
  })
})

describe('backfill of existing events (migration)', () => {
  // Labels found on real events, 2026-11-26.
  const cases: [string | null, number][] = [
    ['nur für Mitglieder', 1],
    ['NUR FÜR MITGLIEDER', 1],
    ['WORKSHOP · NUR FÜR MITGLIEDER', 1],
    ['WORKSHOP · TICKET · MITGLIEDER', 1],
    ['WORKSHOP · MITGLIEDER', 1],
    ['TREFFEN · NUR FÜR MITGLIEDER', 1],
    ['für Interessierte, Gäste und Mitglieder', 0],
    ['FÜR INTERESSIERTE, GÄSTE UND MITGLIEDER', 0],
    ['FÜR ALLE · MITGLIEDER UND GÄSTE', 0],
    ['OFFENER TREFF · FÜR ALLE', 0],
    ['SPIELEABEND · FÜR ALLE', 0],
    [null, 0],
  ]

  it.each(cases)('%s → %i', (category, expected) => {
    const db = new DatabaseSync(':memory:')
    db.exec('create table events (id integer, category text, members_only integer default false)')
    db.exec('create table _events_v (id integer, version_category text, version_members_only integer default false)')
    db.prepare('insert into events (id, category) values (1, ?)').run(category)
    db.prepare('insert into _events_v (id, version_category) values (1, ?)').run(category)
    for (const statement of BACKFILL) db.exec(statement)
    expect(db.prepare('select members_only as m from events').get()?.m).toBe(expected)
    expect(db.prepare('select version_members_only as m from _events_v').get()?.m).toBe(expected)
    db.close()
  })
})

describe('labelBesideMarker', () => {
  it.each([
    ['nur für Mitglieder', null],
    ['WORKSHOP · NUR FÜR MITGLIEDER', 'WORKSHOP'],
    ['WORKSHOP · TICKET · MITGLIEDER', 'WORKSHOP · TICKET'],
    ['TREFFEN · NUR FÜR MITGLIEDER', 'TREFFEN'],
    ['WORKSHOP', 'WORKSHOP'],
    [null, null],
  ])('%s → %s', (category, expected) => {
    expect(labelBesideMarker(category)).toBe(expected)
  })

  it('only trims the label on members-only events', () => {
    expect(toEventVM(anEvent({ membersOnly: true, category: 'WORKSHOP · MITGLIEDER' })).category).toBe('WORKSHOP')
    expect(toEventVM(anEvent({ membersOnly: false, category: 'WORKSHOP · MITGLIEDER' })).category).toBe(
      'WORKSHOP · MITGLIEDER',
    )
  })
})
