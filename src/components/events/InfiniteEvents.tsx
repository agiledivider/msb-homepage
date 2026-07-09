'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Event } from '@/payload-types'
import { ListView } from './ListView'
import { type EventVM, PER_PAGE, toEventVM } from './model'
import { TilesView } from './TilesView'

type ApiResponse = { docs: Event[]; hasNextPage?: boolean }

/** Build the Payload REST query for the next page of upcoming events. */
function eventsQuery(sinceIso: string, page: number) {
  const p = new URLSearchParams()
  p.set('depth', '1')
  p.set('limit', String(PER_PAGE))
  p.set('page', String(page))
  p.set('sort', 'date')
  p.set('where[and][0][_status][equals]', 'published')
  p.set('where[and][1][date][greater_than_equal]', sinceIso)
  return p.toString()
}

/**
 * Client wrapper around the list/tiles views: renders the SSR first page, then
 * appends further pages — automatically as the sentinel scrolls into view, and
 * via an explicit "Mehr laden" button. `sinceIso` is fixed at server render so
 * paging stays stable.
 */
export function InfiniteEvents({
  view,
  initial,
  sinceIso,
  initialPage,
  initialHasMore,
}: {
  view: 'list' | 'tiles'
  initial: EventVM[]
  sinceIso: string
  initialPage: number
  initialHasMore: boolean
}) {
  const [items, setItems] = useState<EventVM[]>(initial)
  const [page, setPage] = useState(initialPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    setError(false)
    try {
      const next = page + 1
      const res = await fetch(`/api/events?${eventsQuery(sinceIso, next)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ApiResponse = await res.json()
      setItems((prev) => [...prev, ...data.docs.map(toEventVM)])
      setPage(next)
      setHasMore(Boolean(data.hasNextPage))
    } catch (e) {
      console.error('load more events:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, sinceIso])

  // Auto-load when the sentinel nears the viewport.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore, hasMore])

  return (
    <div>
      {view === 'tiles' ? <TilesView events={items} /> : <ListView events={items} />}

      <div ref={sentinel} className="mt-8 flex flex-col items-center gap-3">
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-[9px] border border-line bg-card px-5 py-2 font-mono text-[13px] text-muted transition-colors hover:border-brand hover:text-brand-text disabled:opacity-50"
          >
            {loading ? 'Lädt…' : 'Mehr Termine laden'}
          </button>
        ) : (
          <p className="font-mono text-[12.5px] text-faint">Keine weiteren Termine.</p>
        )}
        {error ? (
          <p className="font-mono text-[12px] text-[#c0392b]">Konnte nicht laden — bitte erneut versuchen.</p>
        ) : null}
      </div>
    </div>
  )
}
