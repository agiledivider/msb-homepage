import { z } from 'zod'

/**
 * The calendar-feed setting (S5.12). Kept apart from openingHours.ts so the CMS
 * config doesn't pull in the iCal parser.
 *
 * Editors paste whatever Google shows them, so besides the iCal address this
 * accepts Google's "add calendar" link (`/calendar/u/1?cid=<base64 id>`) and the
 * embed link (`/calendar/embed?src=<id>`), and turns both into the public feed.
 * (Real case 2026-11-26: a cid link was pasted, Google answered with an HTML page.)
 * webcal:// is the same feed over https.
 */

const GOOGLE_HOST = 'calendar.google.com'
const googleFeed = (calendarId: string) =>
  `https://${GOOGLE_HOST}/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`

/** A plausible Google calendar ID: an address-like string, e.g. …@group.calendar.google.com. */
const looksLikeCalendarId = (v: string) => /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(v)

function decodeCid(cid: string): string | null {
  try {
    const b64 = cid.replace(/-/g, '+').replace(/_/g, '/')
    const id = Buffer.from(b64 + '='.repeat((4 - (b64.length % 4)) % 4), 'base64').toString('utf8')
    return looksLikeCalendarId(id) ? id : null
  } catch {
    return null
  }
}

/** Google's web links → the iCal feed; any other URL unchanged. */
export function toFeedUrl(raw: string): string {
  let u: URL
  try {
    u = new URL(raw.trim().replace(/^webcal:\/\//i, 'https://'))
  } catch {
    return raw.trim()
  }
  if (u.hostname !== GOOGLE_HOST || u.pathname.startsWith('/calendar/ical/')) return u.toString()
  const src = u.searchParams.get('src')
  if (src && looksLikeCalendarId(src)) return googleFeed(src)
  const cid = u.searchParams.get('cid')
  const fromCid = cid ? decodeCid(cid) : null
  return fromCid ? googleFeed(fromCid) : u.toString()
}

export const IcsUrlSchema = z.string().trim().transform(toFeedUrl).pipe(z.string().url().startsWith('https://'))
