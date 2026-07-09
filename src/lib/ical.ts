/**
 * Minimal RFC 5545 (iCalendar) builder for the public events feed.
 * Kept dependency-free — we only emit VEVENTs with datetime in UTC, so no
 * VTIMEZONE block is needed (clients localise the trailing-Z timestamps).
 */

/** Escape a TEXT value: backslash, semicolon, comma, and newlines. */
const escapeText = (v: string) =>
  v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Format a Date as an iCal UTC timestamp: YYYYMMDDTHHMMSSZ. */
export const toICalUTC = (d: Date) => `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`

/**
 * Fold a content line to <=75 octets per RFC 5545 §3.1, continuing with
 * CRLF + a single space. Folding is by UTF-8 byte length, not characters.
 */
function foldLine(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line

  const out: string[] = []
  let cur = ''
  let curBytes = 0
  for (const ch of line) {
    const chBytes = enc.encode(ch).length
    // First line budget 75, continuation lines 74 (leading space costs 1).
    const limit = out.length === 0 ? 75 : 74
    if (curBytes + chBytes > limit) {
      out.push(cur)
      cur = ''
      curBytes = 0
    }
    cur += ch
    curBytes += chBytes
  }
  out.push(cur)
  return out.join('\r\n ')
}

type ICalEventBase = {
  uid: string
  stamp: Date
  summary: string
  description?: string | null
  location?: string | null
  url?: string | null
  categories?: string | null
}

/**
 * A timed event carries UTC start/end instants; an all-day event carries
 * DATE values (YYYYMMDD) with `endDate` non-inclusive per RFC 5545.
 */
export type ICalEvent = ICalEventBase &
  ({ allDay: false; start: Date; end: Date } | { allDay: true; startDate: string; endDate: string })

function renderEvent(e: ICalEvent): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${toICalUTC(e.stamp)}`]
  if (e.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${e.startDate}`, `DTEND;VALUE=DATE:${e.endDate}`)
  } else {
    lines.push(`DTSTART:${toICalUTC(e.start)}`, `DTEND:${toICalUTC(e.end)}`)
  }
  lines.push(`SUMMARY:${escapeText(e.summary)}`)
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
  if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
  if (e.url) lines.push(`URL:${escapeText(e.url)}`)
  if (e.categories) lines.push(`CATEGORIES:${escapeText(e.categories)}`)
  lines.push('END:VEVENT')
  return lines
}

export type ICalendarOptions = {
  /** PRODID domain / feed identity, e.g. "makerspace-bonn.de". */
  domain: string
  /** Human-readable calendar name shown in the client. */
  name: string
  /** Suggested refresh cadence in minutes (X-PUBLISHED-TTL / REFRESH-INTERVAL). */
  ttlMinutes?: number
  events: ICalEvent[]
}

/** Assemble a full VCALENDAR document with CRLF line endings + folding. */
export function buildICalendar({ domain, name, ttlMinutes = 720, events }: ICalendarOptions): string {
  const ttl = `PT${ttlMinutes}M`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${domain}//Events//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    `X-PUBLISHED-TTL:${ttl}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${ttl}`,
    ...events.flatMap(renderEvent),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
