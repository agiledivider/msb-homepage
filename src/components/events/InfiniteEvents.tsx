'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ListView } from './ListView'
import { type EventVM, PER_PAGE } from './model'
import { TilesView } from './TilesView'

/**
 * Progressive reveal for the list/tiles views: renders the first `PER_PAGE`
 * events and appends more as the sentinel nears the viewport, plus an explicit
 * "Mehr laden" button.
 *
 * The full set is already in memory (the page ships every published event), so
 * this is a pure slice — no `/api/events` round trip, which is what lets the
 * page work as a plain static document.
 */
export function InfiniteEvents({ view, events }: { view: 'list' | 'tiles'; events: EventVM[] }) {
  const [visible, setVisible] = useState(PER_PAGE)
  const sentinel = useRef<HTMLDivElement>(null)
  const hasMore = visible < events.length

  const loadMore = useCallback(() => setVisible((v) => v + PER_PAGE), [])

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

  const shown = events.slice(0, visible)

  return (
    <div>
      {view === 'tiles' ? <TilesView events={shown} /> : <ListView events={shown} />}

      <div ref={sentinel} className="mt-8 flex flex-col items-center gap-3">
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="rounded-[9px] border border-line bg-card px-5 py-2 font-mono text-[13px] text-muted transition-colors hover:border-brand hover:text-brand-text"
          >
            Mehr Termine laden
          </button>
        ) : (
          <p className="font-mono text-[12.5px] text-faint">Keine weiteren Termine.</p>
        )}
      </div>
    </div>
  )
}
