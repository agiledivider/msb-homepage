'use client'

import { useEffect, useMemo, useState } from 'react'
import { berlinMonthRange, startOfTodayBerlin } from '@/lib/eventTime'
import { CalendarSubscribe } from './CalendarSubscribe'
import { CalendarView } from './CalendarView'
import { InfiniteEvents } from './InfiniteEvents'
import { type EventDTO, hydrateEvent, isViewKey, type ViewKey } from './model'
import { ViewSwitcher } from './ViewSwitcher'

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const parseYm = (v: string | null): Date | null => {
  if (!v || !/^\d{4}-\d{2}$/.test(v)) return null
  const [y, m] = v.split('-').map(Number)
  return m >= 1 && m <= 12 ? new Date(y, m - 1, 1) : null
}

/**
 * The whole /events UI, driven entirely client-side.
 *
 * Two constraints shape this component:
 *
 * 1. **Static hosting has no query-string routing.** `?view=tiles` and
 *    `?month=2026-08` would all resolve to the same HTML file, so view and
 *    month are React state; the URL is updated with `history.replaceState` so
 *    links stay shareable and existing inbound `?view=` links still land on the
 *    right layout (read once on mount).
 * 2. **A published bundle goes stale.** The upcoming/past split is recomputed in
 *    the browser against the real clock after hydration, so a snapshot taken
 *    last week still hides events that have since passed.
 *
 * The server renders the default list view with `nowIso`, so the first client
 * render matches the HTML exactly and only then re-derives.
 */
export function EventsClient({ events, nowIso }: { events: EventDTO[]; nowIso: string }) {
  const all = useMemo(() => events.map(hydrateEvent).sort((a, b) => a.date.getTime() - b.date.getTime()), [events])

  // `now` starts at the server's value (hydration-safe), then switches to the
  // browser's real clock so a stale bundle self-corrects.
  const [now, setNow] = useState(() => new Date(nowIso))
  const [view, setView] = useState<ViewKey>('list')
  const [month, setMonth] = useState<Date | null>(null) // null → the month containing `now`
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (isViewKey(sp.get('view'))) setView(sp.get('view') as ViewKey)
    const m = parseYm(sp.get('month'))
    if (m) setMonth(m)
    setNow(new Date())
    setMounted(true)
  }, [])

  // Mirror state into the URL without navigating (a static host has nothing to
  // navigate to). Skipped until mounted so it can't clobber the inbound query.
  useEffect(() => {
    if (!mounted) return
    const sp = new URLSearchParams()
    if (view !== 'list') sp.set('view', view)
    if (view === 'calendar' && month) sp.set('month', ym(month))
    const qs = sp.toString()
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
  }, [view, month, mounted])

  const upcoming = useMemo(() => {
    const cutoff = startOfTodayBerlin(now).getTime()
    return all.filter((e) => e.date.getTime() >= cutoff)
  }, [all, now])

  const shownMonth = month ?? new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEvents = useMemo(() => {
    const { start, end } = berlinMonthRange(shownMonth.getFullYear(), shownMonth.getMonth() + 1)
    return all.filter((e) => e.date >= start && e.date < end)
  }, [all, shownMonth])

  return (
    <>
      <div className="mb-8 mt-6 flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher current={view} onChange={setView} />
        <div className="flex items-center gap-4">
          <a href="/events/archiv" className="font-mono text-[14px] text-muted no-underline hover:text-ink">
            Archiv →
          </a>
          <CalendarSubscribe />
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView month={shownMonth} events={monthEvents} today={now} onNavigate={setMonth} />
      ) : upcoming.length ? (
        <InfiniteEvents view={view} events={upcoming} />
      ) : (
        <p className="py-16 text-center font-mono text-sm text-muted">Aktuell keine kommenden Termine.</p>
      )}
    </>
  )
}
