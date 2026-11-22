'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Media } from '@/components/Media'
import { eventTagClasses } from '@/components/ui'
import { type EventVM, fmtDay2, fmtMonthShort, fmtWeekdayShort } from './model'

// Per-event aspect ratio keyed by id → a tile's height never changes, so it
// never jumps when more tiles load.
const RATIOS = ['4 / 5', '1 / 1', '3 / 4', '5 / 4', '4 / 3']
const ratioFor = (e: EventVM) => RATIOS[e.id % RATIOS.length]

/** Responsive column count (matches the old columns-1 / sm:2 / lg:3). */
function useColumns() {
  const [cols, setCols] = useState(3) // SSR + first client render
  useEffect(() => {
    const compute = () => setCols(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1)
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])
  return cols
}

function Tile({ e }: { e: EventVM }) {
  return (
    <Link
      href={e.href}
      className="block overflow-hidden rounded-[14px] border border-line bg-card no-underline shadow-[0_12px_34px_-22px_rgba(0,0,0,.5)] transition-transform hover:-translate-y-0.5"
    >
      <Media
        resource={e.image}
        placeholder={e.title}
        className="w-full"
        style={{ aspectRatio: ratioFor(e) } as CSSProperties}
        sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
      />
      <div className="p-4">
        {e.category ? (
          <div
            className={`mb-2 inline-block rounded-[5px] px-2 py-[3px] font-mono text-[14px] ${eventTagClasses(e.tagColor)}`}
          >
            {e.category}
          </div>
        ) : null}
        <div className="font-mono text-[14px] text-muted">
          {fmtWeekdayShort(e.date)} {fmtDay2(e.date)}. {fmtMonthShort(e.date)} · {e.time}
        </div>
        <h3 className="m-0 mt-1 font-sans text-[18px] font-bold text-ink">{e.title}</h3>
        {e.description ? (
          <p className="m-0 mt-1.5 line-clamp-3 text-[14px] leading-[1.5] text-muted">{e.description}</p>
        ) : null}
      </div>
    </Link>
  )
}

/**
 * Photo-first masonry. Tiles are distributed into fixed columns by their order
 * (round-robin), so appending more tiles only grows each column downward —
 * already-visible tiles never move. (CSS `columns` re-balances on append and
 * would shuffle them, which is exactly what we avoid here.)
 */
export function TilesView({ events }: { events: EventVM[] }) {
  const cols = useColumns()
  const columns: EventVM[][] = Array.from({ length: cols }, () => [])
  events.forEach((e, i) => {
    columns[i % cols].push(e)
  })

  return (
    <div className="flex items-start gap-5">
      {columns.map((col, ci) => (
        <div key={ci} className="flex min-w-0 flex-1 basis-0 flex-col gap-5">
          {col.map((e) => (
            <Tile key={e.id} e={e} />
          ))}
        </div>
      ))}
    </div>
  )
}
