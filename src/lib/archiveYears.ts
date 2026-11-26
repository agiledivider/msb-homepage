/**
 * Paging for the events archive (S5.9): one page per Berlin calendar year.
 * The newest year with past events is /events/archiv, older ones live on
 * /events/archiv/2024 … : plain paths, so the static publisher can save each
 * year as its own file, and old links to /events/archiv keep opening page one.
 */
import { BERLIN_TZ, berlinMonthRange } from './eventTime'

export const ARCHIVE_PATH = '/events/archiv'

const yearFmt = new Intl.DateTimeFormat('en', { timeZone: BERLIN_TZ, year: 'numeric' })

/** The year a moment belongs to in Bonn (23:30 UTC on 31 Dec is already next year). */
export const berlinYear = (d: Date) => Number(yearFmt.format(d))

/** Distinct Berlin years of the given event dates, newest first. */
export function archiveYears(dates: Date[]): number[] {
  return [...new Set(dates.map(berlinYear))].sort((a, b) => b - a)
}

/** Address of a year's archive page; the newest year is the archive itself. */
export const archiveYearPath = (year: number, newest: number) =>
  year === newest ? ARCHIVE_PATH : `${ARCHIVE_PATH}/${year}`

/** "2023" → 2023; anything that isn't a four-digit year → null (404). */
export function parseArchiveYear(raw: string): number | null {
  return /^(19|20)\d{2}$/.test(raw) ? Number(raw) : null
}

/** UTC instants bounding a Berlin calendar year `[start, end)`. */
export function berlinYearRange(year: number): { start: Date; end: Date } {
  return { start: berlinMonthRange(year, 1).start, end: berlinMonthRange(year + 1, 1).start }
}
