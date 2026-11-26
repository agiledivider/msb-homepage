import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EventArticle } from '@/components/Article'
import { eventSignup, validateSignupUrl } from '@/lib/eventSignup'
import { eventToFace } from '@/lib/mappers'
import type { Event } from '@/payload-types'

// S5.19: the start page invites to an event the way that event actually works.

const anEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 7,
    title: 'Teckids Campdays',
    slug: 'teckids-campdays-2026-12-28',
    date: '2026-12-28T12:00:00.000Z',
    timeLabel: 'ab 10',
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  }) as Event

describe('hero face invitation', () => {
  it.each([
    // [case, overrides, note, primary, secondary]
    [
      'untouched event (as today)',
      {},
      'kostenlos ✦',
      ['Platz sichern', '/events/teckids-campdays-2026-12-28'],
      '/events',
    ],
    [
      'free, explicit',
      { free: true },
      'kostenlos ✦',
      ['Platz sichern', '/events/teckids-campdays-2026-12-28'],
      '/events',
    ],
    [
      'not free, no sign-up',
      { free: false },
      undefined,
      ['Zum Termin', '/events/teckids-campdays-2026-12-28'],
      '/events',
    ],
    [
      'not free, external sign-up',
      { free: false, signupUrl: 'https://www.teckids.org/campdays' },
      undefined,
      ['Anmelden auf teckids.org', 'https://www.teckids.org/campdays'],
      '/events/teckids-campdays-2026-12-28',
    ],
    [
      'free, external sign-up',
      { free: true, signupUrl: 'https://pretix.eu/msb/repair' },
      'kostenlos ✦',
      ['Anmelden auf pretix.eu', 'https://pretix.eu/msb/repair'],
      '/events/teckids-campdays-2026-12-28',
    ],
  ] as const)('%s', (_case, overrides, note, [label, url], secondaryUrl) => {
    const face = eventToFace(anEvent(overrides as Partial<Event>))
    expect(face.note).toBe(note)
    expect(face.primary).toEqual({ label, url })
    expect(face.secondary?.url).toBe(secondaryUrl)
  })

  it('never promises a free seat for an event that costs something', () => {
    const face = eventToFace(anEvent({ free: false, signupUrl: 'https://teckids.org/x' }))
    expect(JSON.stringify(face)).not.toMatch(/kostenlos|Platz sichern/)
  })

  it('keeps the members-only invitation, whatever the sign-up says', () => {
    const face = eventToFace(anEvent({ membersOnly: true, signupUrl: 'https://teckids.org/x' }))
    expect(face.primary).toEqual({ label: 'Mitglied werden', url: '/mitmachen' })
  })

  it('ignores a sign-up address that is not https', () => {
    const face = eventToFace(anEvent({ signupUrl: 'http://teckids.org/x' }))
    expect(face.primary?.label).toBe('Platz sichern')
  })
})

describe('event page', () => {
  it('shows the external sign-up', () => {
    const html = renderToStaticMarkup(<EventArticle ev={anEvent({ signupUrl: 'https://teckids.org/campdays' })} />)
    expect(html).toContain('href="https://teckids.org/campdays"')
    expect(html).toContain('Anmelden auf teckids.org')
  })

  it('shows nothing extra without one', () => {
    expect(renderToStaticMarkup(<EventArticle ev={anEvent()} />)).not.toContain('Anmelden auf')
  })
})

describe('sign-up address', () => {
  it.each([
    ['', true],
    ['   ', true],
    [null, true],
    ['https://teckids.org/anmeldung', true],
    ['http://teckids.org', false],
    ['teckids.org', false],
    ['javascript:alert(1)', false],
  ])('%j is valid: %s', (value, ok) => {
    expect(validateSignupUrl(value) === true).toBe(ok)
  })

  it('reads the host without www', () => {
    expect(eventSignup(' https://www.teckids.org/a ')).toEqual({
      url: 'https://www.teckids.org/a',
      host: 'teckids.org',
    })
  })
})
