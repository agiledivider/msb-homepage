'use client'

import { useEffect, useMemo, useState } from 'react'
import { startOfTodayBerlin } from '@/lib/eventTime'
import { ListView } from './ListView'
import { type EventDTO, hydrateEvent } from './model'

/**
 * The homepage "Was läuft" feed.
 *
 * Renders the next `limit` upcoming events, but re-derives "upcoming" against
 * the browser's clock after hydration: a statically published bundle would
 * otherwise keep advertising events that have already happened until the next
 * republish. The server passes a deeper slice than it displays so there's
 * something left to show as the front of the list expires.
 */
export function UpcomingList({ events, nowIso, limit }: { events: EventDTO[]; nowIso: string; limit: number }) {
  const [now, setNow] = useState(() => new Date(nowIso))
  useEffect(() => setNow(new Date()), [])

  const shown = useMemo(() => {
    const cutoff = startOfTodayBerlin(now).getTime()
    return events
      .map(hydrateEvent)
      .filter((e) => e.date.getTime() >= cutoff)
      .slice(0, limit)
  }, [events, now, limit])

  return <ListView events={shown} />
}
