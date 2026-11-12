import { resolveEventTimes } from '@/lib/eventTime'
import { buildICalendar, type ICalEvent } from '@/lib/ical'
import { serverURL } from '@/lib/preview'
import { findPublic } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

/** How far back published events stay in the feed (keeps recent history). */
const HISTORY_MS = 90 * 24 * 60 * 60 * 1000

/**
 * Public iCal subscription feed of published events at /events/calendar.ics.
 * Subscribe once and the client re-polls periodically for new/changed events.
 */
export async function GET() {
  const host = new URL(serverURL).host

  const since = new Date(Date.now() - HISTORY_MS)
  const res = await findPublic({
    collection: 'events',
    where: { date: { greater_than_equal: since.toISOString() } },
    sort: 'date',
    limit: 1000,
    depth: 0,
  })

  const events: ICalEvent[] = res.docs.map((e) => {
    const path = `/events/${e.slug ?? e.id}`
    // Date comes from date/endDate; time-of-day is derived from the timeLabel.
    const times = resolveEventTimes(e.date, e.endDate, e.timeLabel)
    return {
      uid: `event-${e.id}@${host}`,
      stamp: new Date(e.updatedAt ?? e.date),
      summary: e.title,
      description: e.description,
      location: e.location,
      url: `${serverURL}${path}`,
      categories: e.category,
      ...times,
    }
  })

  const body = buildICalendar({
    domain: host,
    name: 'MakerSpace Bonn — Events',
    events,
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="makerspace-bonn.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
