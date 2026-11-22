'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BTN_SECONDARY } from '@/components/ui'
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
            className={`${BTN_SECONDARY} min-h-11 rounded-[9px] px-5 font-mono text-[14px]`}
          >
            Mehr Termine laden
          </button>
        ) : (
          <p className="font-mono text-[14px] text-muted">Keine weiteren Termine.</p>
        )}
      </div>
    </div>
  )
}
