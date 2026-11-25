import ICAL from 'ical.js'
import { BERLIN_TZ } from './eventTime'
import { IcsUrlSchema } from './icsUrl'

/**
 * Opening hours for the start-page box, read from the Verein's calendar feed
 * (Google Calendar "iCal address"; any RFC 5545 feed works). S5.12.
 *
 * The feed is fetched on the server only: Google sends no CORS header, and the
 * URL may be a secret address, so it never reaches the browser. Every entry in
 * the next WINDOW_DAYS days becomes one row; recurring entries are expanded
 * (RRULE, EXDATE, moved or cancelled single dates). Times are shown in Berlin.
 */

export type HourRow = { day: string; note: string; time: string; highlight: boolean }

export const WINDOW_DAYS = 14
export const MAX_ROWS = 20
const CACHE_TTL_MS = 15 * 60 * 1000 // a calendar change shows within ~15 min
const STALE_MAX_MS = 24 * 60 * 60 * 1000 // Google down: keep the last good feed for a day
const TIMEOUT_MS = 5000
const RETRY_MS = 60 * 1000 // after a failed fetch
const MAX_BYTES = 5 * 1024 * 1024
const MAX_OCCURRENCES = 2000 // per recurring entry, guards against endless rules
const DAY_MS = 24 * 60 * 60 * 1000

/** Entries with this in the title get the green "Offene Tür" highlight. */
const HIGHLIGHT_RE = /offene\s*t(ü|ue)r/i

/** Which calendar entries the box shows (CMS setting, S5.12). */
export const SHOW_MODES = ['all', 'opening'] as const
export type ShowMode = (typeof SHOW_MODES)[number]

/** "Offen", "geöffnet", "Offene Tür", "Andreas macht auf"; closures never count. */
const OPENING_RE = /\boffen|geöffnet|macht\s+auf/i
const CLOSED_RE = /geschlossen/i
export const isOpeningTime = (title: string) => OPENING_RE.test(title) && !CLOSED_RE.test(title)

/**
 * Calendar titles sometimes carry the whole announcement ("Handarbeitstreff &
 * Makerbrunch - Diesen Sonntag geht es ab 10 Uhr weiter …"): keep the part
 * before the first " - ".
 */
export const shortTitle = (title: string) => title.split(/\s+[-–]\s+/)[0].trim()

/** Fallback zone when a feed uses TZID=Europe/Berlin without shipping its VTIMEZONE. */
const BERLIN_VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n')

type Occurrence = { start: Date; end: Date; allDay: boolean; title: string }

const weekdayFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: BERLIN_TZ })
const dayFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', timeZone: BERLIN_TZ })
const hmFmt = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: BERLIN_TZ,
})
const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: BERLIN_TZ }) // YYYY-MM-DD

/** Berlin midnight of the day `now` falls on, as a UTC instant. */
function startOfBerlinDay(now: Date): Date {
  const [y, m, d] = ymdFmt.format(now).split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d))
  // Berlin is UTC+1 or +2: midnight there is 22:00 or 23:00 UTC the day before.
  for (const offsetH of [1, 2]) {
    const candidate = new Date(guess.getTime() - offsetH * 3600_000)
    if (ymdFmt.format(candidate) === ymdFmt.format(now) && hmFmt.format(candidate) === '00:00') return candidate
  }
  return guess
}

/** "18:00" → "18", "18:30" stays. */
const shortTime = (d: Date) => hmFmt.format(d).replace(/:00$/, '')

function toRow(o: Occurrence, windowStart: Date): HourRow {
  const shown = o.start < windowStart ? windowStart : o.start // a multi-day entry that began earlier
  return {
    day: `${weekdayFmt.format(shown).replace('.', '')} ${dayFmt.format(shown)}.`,
    note: o.title,
    time: o.allDay ? 'ganztägig' : `${shortTime(o.start)}–${shortTime(o.end)}`,
    highlight: HIGHLIGHT_RE.test(o.title),
  }
}

/** All-day dates are Berlin days, not UTC days. */
function toInstant(t: ICAL.Time): Date {
  if (t.isDate) {
    const [y, m, d] = [t.year, t.month, t.day]
    return startOfBerlinDay(new Date(Date.UTC(y, m - 1, d, 12)))
  }
  return t.toJSDate()
}

const isCancelled = (ev: ICAL.Event) =>
  String(ev.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED'

function occurrencesOf(ev: ICAL.Event, from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = []
  const push = (start: ICAL.Time, end: ICAL.Time, item: ICAL.Event) => {
    if (isCancelled(item)) return
    const s = toInstant(start)
    const e = toInstant(end)
    if (e > from && s < to)
      out.push({ start: s, end: e, allDay: start.isDate, title: shortTitle(item.summary ?? '') || 'Offen' })
  }

  if (!ev.isRecurring()) {
    push(ev.startDate, ev.endDate ?? ev.startDate, ev)
    return out
  }
  // Moved single dates are found by their original slot; look a window past `to`.
  const stopAt = to.getTime() + WINDOW_DAYS * DAY_MS
  const it = ev.iterator()
  for (let i = 0, next = it.next(); next && i < MAX_OCCURRENCES; i++, next = it.next()) {
    if (toInstant(next).getTime() >= stopAt) break
    const d = ev.getOccurrenceDetails(next)
    push(d.startDate, d.endDate, d.item)
  }
  return out
}

/**
 * The rows for the WINDOW_DAYS days starting at Berlin midnight of `now`, soonest
 * first. Returns null when the text isn't a calendar (so the caller falls back).
 */
export function parseOpeningHours(ics: string, now: Date, show: ShowMode = 'all'): HourRow[] | null {
  let cal: ICAL.Component
  try {
    cal = new ICAL.Component(ICAL.parse(ics))
  } catch {
    return null
  }
  if (cal.name !== 'vcalendar') return null

  for (const vtz of cal.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(new ICAL.Timezone(vtz))
  if (!ICAL.TimezoneService.has(BERLIN_TZ))
    ICAL.TimezoneService.register(new ICAL.Timezone(new ICAL.Component(ICAL.parse(BERLIN_VTIMEZONE))))

  const from = startOfBerlinDay(now)
  const to = new Date(from.getTime() + WINDOW_DAYS * DAY_MS)

  // Masters first, then attach each "this date only" override to its series.
  const vevents = cal.getAllSubcomponents('vevent')
  const masters = new Map<string, ICAL.Event>()
  const loose: ICAL.Event[] = []
  for (const c of vevents) {
    if (c.hasProperty('recurrence-id')) continue
    const ev = new ICAL.Event(c)
    masters.set(ev.uid, ev)
  }
  for (const c of vevents) {
    if (!c.hasProperty('recurrence-id')) continue
    const ex = new ICAL.Event(c)
    const master = masters.get(ex.uid)
    if (master) master.relateException(ex)
    else loose.push(ex) // override without its series: show it as a single entry
  }

  return [...masters.values(), ...loose]
    .flatMap((ev) => {
      try {
        return occurrencesOf(ev, from, to)
      } catch {
        return [] // one broken entry must not blank the whole box
      }
    })
    .filter((o) => show === 'all' || isOpeningTime(o.title))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, MAX_ROWS)
    .map((o) => toRow(o, from))
}

/** Last good feed per URL, plus when we last tried (successful or not). */
type CacheEntry = { fetchedAt: number; ics: string | null; triedAt: number }
const cache = new Map<string, CacheEntry>()

/** Test hook: forget every fetched feed. */
export function clearOpeningHoursCache() {
  cache.clear()
}

type LoadDeps = { now: Date; fetchFn?: typeof fetch; show?: ShowMode }

async function fetchIcs(url: string, fetchFn: typeof fetch): Promise<string> {
  const res = await fetchFn(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'text/calendar' },
    cache: 'no-store', // cached below instead, so the static publisher and tests behave the same
  })
  if (!res.ok) throw new Error(`calendar feed answered ${res.status}`)
  const text = await res.text()
  if (text.length > MAX_BYTES) throw new Error('calendar feed too large')
  return text
}

/**
 * Rows from the feed at `rawUrl`, or null when there is no usable feed (no URL,
 * not a calendar, unreachable with no good copy from the last day). Fetched at
 * most every 15 minutes per URL; after a failure the next try waits a minute, so
 * a slow Google doesn't hold up every page view.
 */
export async function loadOpeningHours(
  rawUrl: string | null | undefined,
  { now, fetchFn = fetch, show = 'all' }: LoadDeps,
): Promise<HourRow[] | null> {
  const url = IcsUrlSchema.safeParse(rawUrl ?? '')
  if (!url.success) return null

  const t = now.getTime()
  const prev = cache.get(url.data)
  const stale = !prev?.ics || t - prev.fetchedAt >= CACHE_TTL_MS
  const due = !prev || (stale && t - prev.triedAt >= RETRY_MS)
  let entry = prev
  if (due) {
    try {
      entry = { fetchedAt: t, ics: await fetchIcs(url.data, fetchFn), triedAt: t }
    } catch {
      entry = { fetchedAt: prev?.fetchedAt ?? t, ics: prev?.ics ?? null, triedAt: t }
    }
    cache.set(url.data, entry)
  }
  if (!entry?.ics || t - entry.fetchedAt >= STALE_MAX_MS) return null
  return parseOpeningHours(entry.ics, now, show)
}

type FallbackRow = { day?: string | null; note?: string | null; time?: string | null; highlight?: boolean | null }

/** Shown when neither the calendar nor the CMS has rows (the box's original demo content). */
export const DEFAULT_ROWS: HourRow[] = [
  { day: 'Do 02.', note: 'Offen', time: '18–21', highlight: false },
  { day: 'Sa 05.', note: 'Handarbeit', time: '10–14', highlight: false },
  { day: 'Mo 06.', note: 'Offene Tür', time: 'ab 10', highlight: true },
  { day: 'Di 07.', note: 'Offen', time: '18–21', highlight: false },
  { day: 'Mi 08.', note: 'Offen', time: '18:30–21', highlight: false },
]

/** Calendar rows when the calendar has any; else the editors' rows; else DEFAULT_ROWS. */
export function pickHourRows(live: HourRow[] | null, fallback: FallbackRow[] | null | undefined): HourRow[] {
  if (live?.length) return live
  const typed = (fallback ?? [])
    .map((r) => ({
      day: r.day?.trim() ?? '',
      note: r.note?.trim() ?? '',
      time: r.time?.trim() ?? '',
      highlight: !!r.highlight,
    }))
    .filter((r) => r.day || r.note || r.time)
  return typed.length ? typed : DEFAULT_ROWS
}
