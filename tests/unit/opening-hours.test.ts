import { readFileSync } from 'node:fs'
import path from 'node:path'
import ICAL from 'ical.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { groupByDay } from '@/blocks/EventFeed/Sidebar'
import { IcsUrlSchema, toFeedUrl } from '@/lib/icsUrl'
import {
  clearOpeningHoursCache,
  DEFAULT_ROWS,
  isOpeningTime,
  loadOpeningHours,
  parseOpeningHours,
  pickHourRows,
  shortTitle,
} from '@/lib/openingHours'

// Google-style feed: weekly series with a moved date, an EXDATE and a cancelled
// date, a UTC single entry, an all-day entry, a cancelled entry, and entries
// outside the window. The 14-day window (Wed 21 Oct – Tue 3 Nov 2026) spans the DST change.
const ICS = readFileSync(path.resolve(import.meta.dirname, '../fixtures/opening-hours.ics'), 'utf8')
const WED_NOON = new Date('2026-10-21T10:00:00Z')
const URL_ = 'https://calendar.google.com/calendar/ical/x/public/basic.ics'

const EXPECTED = [
  { day: 'Mi 21.', note: 'Offen', time: '18:30–21', highlight: false }, // moved from 18:00
  { day: 'Sa 24.', note: 'Offene Tür', time: '10–14', highlight: true }, // 08:00Z in CEST
  { day: 'So 25.', note: 'Repair Café, mit Anmeldung', time: 'ganztägig', highlight: false },
  { day: 'Di 27.', note: 'Offen', time: '18–21', highlight: false }, // after DST: still 18, not 17; Mo 26 is an EXDATE
  { day: 'Mi 28.', note: 'Offen', time: '18–21', highlight: false },
  { day: 'Fr 30.', note: 'Handarbeit', time: '10–14', highlight: false }, // Fr 23 was cancelled
  { day: 'Mo 02.', note: 'Offen', time: '18–21', highlight: false },
  { day: 'Di 03.', note: 'Offen', time: '18–21', highlight: false },
]

const okFetch = (body = ICS) => vi.fn(async () => new Response(body, { status: 200 })) as unknown as typeof fetch

describe('parseOpeningHours', () => {
  it('lists the next 14 Berlin days, recurring entries expanded', () => {
    expect(parseOpeningHours(ICS, WED_NOON)).toEqual(EXPECTED)
  })

  it('starts at Berlin midnight: late on Tuesday evening UTC is already Wednesday', () => {
    // 22:30Z on Tue 20 Oct = 00:30 Wed 21 in Berlin
    expect(parseOpeningHours(ICS, new Date('2026-10-20T22:30:00Z'))?.[0]?.day).toBe('Mi 21.')
  })

  it('works when the feed lacks its VTIMEZONE block', () => {
    ICAL.TimezoneService.reset() // forget the zone an earlier test registered
    const noTz = ICS.replace(/BEGIN:VTIMEZONE[\s\S]*?END:VTIMEZONE\r?\n/, '')
    expect(noTz).not.toContain('VTIMEZONE')
    expect(parseOpeningHours(noTz, WED_NOON)).toEqual(EXPECTED)
  })

  it('returns an empty list for a calendar with nothing in the window', () => {
    expect(parseOpeningHours(ICS, new Date('2020-01-01T12:00:00Z'))).toEqual([])
  })

  it.each([
    ['HTML error page', '<html>Not found</html>'],
    ['empty', ''],
    ['a vcard', 'BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD\r\n'],
  ])('returns null for %s', (_n, body) => {
    expect(parseOpeningHours(body, WED_NOON)).toBeNull()
  })
})

describe('IcsUrlSchema', () => {
  it.each([
    [URL_, URL_],
    ['webcal://example.org/cal.ics', 'https://example.org/cal.ics'],
    [`  ${URL_}  `, URL_],
  ])('accepts %s', (input, out) => {
    expect(IcsUrlSchema.parse(input)).toBe(out)
  })

  it.each([['http://example.org/cal.ics'], ['file:///etc/passwd'], ['kein link'], ['']])('rejects %s', (input) => {
    expect(IcsUrlSchema.safeParse(input).success).toBe(false)
  })
})

describe('toFeedUrl (links editors copy out of Google)', () => {
  const ID = 'abc123example@group.calendar.google.com'
  const FEED = 'https://calendar.google.com/calendar/ical/abc123example%40group.calendar.google.com/public/basic.ics'
  const cid = Buffer.from(ID).toString('base64').replace(/=+$/, '')

  it.each([
    ['"add calendar" link', `https://calendar.google.com/calendar/u/1?cid=${cid}`],
    [
      '"add calendar" link, padded',
      `https://calendar.google.com/calendar/u/0?cid=${Buffer.from(ID).toString('base64')}`,
    ],
    ['embed link', `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(ID)}&ctz=Europe%2FBerlin`],
    ['the feed itself', FEED],
  ])('%s → public feed', (_n, link) => {
    expect(toFeedUrl(link)).toBe(FEED)
    expect(IcsUrlSchema.parse(link)).toBe(FEED)
  })

  it('leaves a secret feed address and non-Google feeds alone', () => {
    const secret = 'https://calendar.google.com/calendar/ical/x%40group.calendar.google.com/private-abc/basic.ics'
    expect(toFeedUrl(secret)).toBe(secret)
    expect(toFeedUrl('https://cloud.example.org/remote.php/dav/public-calendars/x?export')).toBe(
      'https://cloud.example.org/remote.php/dav/public-calendars/x?export',
    )
  })

  it('leaves a cid that is not a calendar ID unchanged', () => {
    expect(toFeedUrl('https://calendar.google.com/calendar/u/1?cid=bm9wZQ')).toBe(
      'https://calendar.google.com/calendar/u/1?cid=bm9wZQ',
    )
  })
})

describe('loadOpeningHours', () => {
  beforeEach(() => clearOpeningHoursCache())

  it('returns null without a URL and never calls out', async () => {
    const fetchFn = okFetch()
    expect(await loadOpeningHours(null, { now: WED_NOON, fetchFn })).toBeNull()
    expect(await loadOpeningHours('', { now: WED_NOON, fetchFn })).toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('fetches once per 15 minutes', async () => {
    const fetchFn = okFetch()
    const at = (min: number) => ({ now: new Date(WED_NOON.getTime() + min * 60_000), fetchFn })
    expect(await loadOpeningHours(URL_, at(0))).toEqual(EXPECTED)
    await loadOpeningHours(URL_, at(14))
    expect(fetchFn).toHaveBeenCalledTimes(1)
    await loadOpeningHours(URL_, at(15))
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('keeps the last good feed when Google is down, and backs off between tries', async () => {
    const at = (min: number) => new Date(WED_NOON.getTime() + min * 60_000)
    await loadOpeningHours(URL_, { now: at(0), fetchFn: okFetch() })

    const down = vi.fn(async () => {
      throw new Error('ECONNRESET')
    }) as unknown as typeof fetch
    expect(await loadOpeningHours(URL_, { now: at(20), fetchFn: down })).toEqual(EXPECTED)
    expect(await loadOpeningHours(URL_, { now: at(20.5), fetchFn: down })).toEqual(EXPECTED)
    expect(down).toHaveBeenCalledTimes(1) // second view within the minute: no new try

    // more than a day without a good copy: give up, the caller shows its fallback
    expect(await loadOpeningHours(URL_, { now: at(25 * 60), fetchFn: down })).toBeNull()
  })

  it('returns null on a non-200 answer with nothing cached', async () => {
    const notFound = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch
    expect(await loadOpeningHours(URL_, { now: WED_NOON, fetchFn: notFound })).toBeNull()
  })

  it('sends a timeout signal with every call', async () => {
    const fetchFn = okFetch()
    await loadOpeningHours(URL_, { now: WED_NOON, fetchFn })
    const init = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('pickHourRows', () => {
  const live = [{ day: 'Mi 21.', note: 'Offen', time: '18–21', highlight: false }]

  it.each([
    ['calendar rows win', live, [{ day: 'Mi', note: 'Offen', time: '15–21' }], live],
    [
      'editor rows when the calendar is empty',
      [],
      [{ day: ' Mi ', note: 'Offen', time: '15–21', highlight: null }],
      [{ day: 'Mi', note: 'Offen', time: '15–21', highlight: false }],
    ],
    [
      'editor rows when the calendar is unusable',
      null,
      [{ day: 'Sa', note: 'Offene Tür', time: 'ab 10', highlight: true }],
      [{ day: 'Sa', note: 'Offene Tür', time: 'ab 10', highlight: true }],
    ],
  ])('%s', (_n, liveRows, fallback, expected) => {
    expect(pickHourRows(liveRows, fallback)).toEqual(expected)
  })

  it('falls back to the built-in rows when everything is empty (blank editor rows ignored)', () => {
    expect(pickHourRows(null, [{ day: ' ', note: null, time: '' }])).toEqual(DEFAULT_ROWS)
    expect(pickHourRows(null, undefined)).toEqual(DEFAULT_ROWS)
  })
})

describe('show mode', () => {
  it('"opening" keeps opening times only', () => {
    expect(parseOpeningHours(ICS, WED_NOON, 'opening')).toEqual(
      EXPECTED.filter((r) => !['Repair Café, mit Anmeldung', 'Handarbeit'].includes(r.note)),
    )
  })

  it.each([
    // titles from the Verein calendar, 2026-11-26
    ['Offen (für Mitglieder)', true],
    ['Offene Tür (für Interessierte, Gäste und Mitglieder)', true],
    ['Makerspace geöffnet (für Mitglieder)', true],
    ['MSB offen (selbständiges Makern)', true],
    ['Andreas macht auf', true],
    ['MakerSpace wegen Veranstaltung geschlossen', false],
    ['Makerspace geschlossen wegen nicht öffentlicher Veranstaltung', false],
    ['Spieleabend (für Interessierte, Gäste und Mitglieder)', false],
    ['Monatliches Mitgliedertreffen (für Mitglieder)', false],
    ['Handarbeitstreff & Makerbrunch', false],
    ['Hoffentlich bald wieder', false],
  ])('%s → %s', (title, expected) => {
    expect(isOpeningTime(title)).toBe(expected)
  })
})

describe('shortTitle', () => {
  it.each([
    [
      'Handarbeitstreff & Makerbrunch - Diesen Sonntag geht es ab 10 Uhr weiter mit dem Handarbeitstreff.',
      'Handarbeitstreff & Makerbrunch',
    ],
    ['Offen – nur Mitglieder', 'Offen'],
    ['Hack-n-Forget', 'Hack-n-Forget'], // a hyphen inside a word stays
    ['Offen (für Mitglieder)', 'Offen (für Mitglieder)'],
  ])('%s', (title, expected) => {
    expect(shortTitle(title)).toBe(expected)
  })
})

describe('groupByDay', () => {
  const row = (day: string, note: string, highlight = false) => ({ day, note, time: '18–21', highlight })

  it('shows a day once when it has several entries, highlighted if any entry is', () => {
    const groups = groupByDay([
      row('Do 26.', 'Offen'),
      row('Mo 30.', 'Offen'),
      row('Mo 30.', 'Offene Tür', true),
      row('Di 01.', 'Offen'),
    ])
    expect(groups.map((g) => [g.day, g.entries.length, g.highlight])).toEqual([
      ['Do 26.', 1, false],
      ['Mo 30.', 2, true],
      ['Di 01.', 1, false],
    ])
  })

  it('never merges rows without a day', () => {
    expect(groupByDay([row('', 'a'), row('', 'b')])).toHaveLength(2)
  })
})
