/**
 * Resolves an event's calendar times for the iCal feed.
 *
 * The stored `date`/`endDate` only supply the **day** — the wall-clock **time**
 * comes from the free-text `timeLabel` (e.g. "ab 10", "10–14", "14:00"). Days are
 * read in Europe/Berlin so an evening event doesn't slip to the previous day, and
 * timed events are converted to a real UTC instant (accounting for CET/CEST).
 *
 *   "ab 10" / "14:00"  → timed, 2 h default duration
 *   "10–14" / "19–21"  → timed range
 *   "ganztägig" / none → all-day (VALUE=DATE)
 */

const TZ = 'Europe/Berlin'
/** Default length for a single start time ("ab 10", "14:00"). */
export const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

type HM = { h: number; m: number }
type TimeSpec = { allDay: true } | { allDay: false; start: HM; end: HM | null }

/**
 * Human-readable time for display in the UI: the event's `timeLabel` verbatim
 * (e.g. "ab 10", "10–14"), or "ganztägig" when no time is set. The stored
 * `date` is day-only, so its time-of-day must never be shown.
 */
export const eventTimeText = (timeLabel?: string | null) => timeLabel?.trim() || 'ganztägig'

/** Words that force an all-day event regardless of any digits present. */
const ALL_DAY_RE = /ganztä|ganztag|all[\s-]?day|whole\s?day/i

/**
 * Parse a `timeLabel` into a time spec. Returns all-day when empty, an all-day
 * keyword, or no parseable time token; a range when two times are present; a
 * single start (end = null → default duration) otherwise.
 */
export function parseTimeLabel(label?: string | null): TimeSpec {
  const s = (label ?? '').trim()
  if (!s || ALL_DAY_RE.test(s)) return { allDay: true }

  const tokens = [...s.matchAll(/(\d{1,2})(?::(\d{2}))?/g)]
    .map((m) => ({ h: Number(m[1]), m: m[2] ? Number(m[2]) : 0 }))
    .filter((t) => t.h <= 23 && t.m <= 59)

  if (tokens.length === 0) return { allDay: true }
  if (tokens.length >= 2) return { allDay: false, start: tokens[0], end: tokens[1] }
  return { allDay: false, start: tokens[0], end: null }
}

type YMD = { y: number; m: number; d: number }

/** Calendar Y/M/D of an instant as seen in Europe/Berlin. */
function berlinYMD(date: Date): YMD {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day') }
}

/** Milliseconds Europe/Berlin is ahead of UTC at the given instant (CET +1h / CEST +2h). */
function berlinOffsetMs(date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(date.toLocaleString('en-US', { timeZone: TZ }))
  return local.getTime() - utc.getTime()
}

/** Convert a Berlin wall-clock (y/m/d h:min) to the matching absolute UTC instant. */
function berlinWallClockToUTC({ y, m, d }: YMD, { h, m: min }: HM): Date {
  const guess = Date.UTC(y, m - 1, d, h, min)
  return new Date(guess - berlinOffsetMs(new Date(guess)))
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Format Y/M/D as an iCal DATE value: YYYYMMDD. */
const fmtDate = ({ y, m, d }: YMD) => `${y}${pad(m)}${pad(d)}`
/** The day after a Y/M/D (handles month/year rollover) — used for exclusive DTEND. */
function nextDay({ y, m, d }: YMD): YMD {
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

export type ResolvedTimes =
  | { allDay: true; startDate: string; endDate: string } // YYYYMMDD, endDate exclusive
  | { allDay: false; start: Date; end: Date }

/** Combine the stored day(s) with the timeLabel into concrete feed times. */
export function resolveEventTimes(
  dateISO: string,
  endDateISO: string | null | undefined,
  timeLabel: string | null | undefined,
): ResolvedTimes {
  const spec = parseTimeLabel(timeLabel)
  const startDay = berlinYMD(new Date(dateISO))
  const endDay = endDateISO ? berlinYMD(new Date(endDateISO)) : startDay

  if (spec.allDay) {
    return { allDay: true, startDate: fmtDate(startDay), endDate: fmtDate(nextDay(endDay)) }
  }

  const start = berlinWallClockToUTC(startDay, spec.start)
  const rawEnd = spec.end ? berlinWallClockToUTC(endDay, spec.end) : new Date(start.getTime() + DEFAULT_DURATION_MS)
  // Guard against an end that isn't after the start (e.g. a malformed range).
  const end = rawEnd.getTime() > start.getTime() ? rawEnd : new Date(start.getTime() + DEFAULT_DURATION_MS)
  return { allDay: false, start, end }
}
