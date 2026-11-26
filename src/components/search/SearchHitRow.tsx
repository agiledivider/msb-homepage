import { faFileLines, faPenNib } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import { Fragment } from 'react'
import { ToolIcon } from '@/blocks/Workshops/ToolIcon'
import { Media } from '@/components/Media'
import { BERLIN_TZ } from '@/lib/eventTime'
import type { SearchHit, SearchKind } from '@/lib/search'
import type { Segment } from '@/lib/search/text'

/**
 * Search results (S5.17): one row per hit, the same in the quick results under
 * the header and on /suche. Every kind has its own glyph on the left: an
 * event's date stamp, a post's photo, a workshop's tool, a page's sheet.
 */

/** Matched words, underlaid like a highlighter stroke on paper. */
export function Marked({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.hit ? (
          <mark
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are a fixed split of one string
            key={i}
            className="rounded-[0.2em_0.55em_0.3em_0.45em] bg-marker px-[0.1em] text-inherit [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
          >
            {s.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are a fixed split of one string
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  )
}

const de = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN_TZ, ...opts })
const day = de({ day: 'numeric' })
const month = de({ month: 'short' })
const longDate = de({ day: 'numeric', month: 'long', year: 'numeric' })

export const KIND_LABEL: Record<SearchKind, string> = {
  event: 'Event',
  blog: 'Blog',
  workshop: 'Werkstatt',
  page: 'Seite',
}

/** The left-hand glyph: what kind of thing this is, at a glance. */
function Glyph({ hit, size }: { hit: SearchHit; size: 'quick' | 'full' }) {
  const box = size === 'full' ? 'h-16 w-16' : 'h-12 w-12'
  if (hit.kind === 'event' && hit.date) {
    const d = new Date(hit.date)
    return (
      <div
        className={`${box} flex shrink-0 flex-col items-center justify-center rounded-[10px] border ${
          hit.past ? 'border-line bg-fond text-muted' : 'border-brand-text bg-green-pale text-brand-text'
        }`}
        aria-hidden="true"
      >
        <span className={`font-sans font-bold leading-none ${size === 'full' ? 'text-[24px]' : 'text-[19px]'}`}>
          {day.format(d)}
        </span>
        <span className="font-mono text-[14px] leading-tight">{month.format(d).replace('.', '')}</span>
      </div>
    )
  }
  if (hit.kind === 'blog' && hit.image) {
    return (
      <Media
        resource={hit.image}
        className={`${box} shrink-0 overflow-hidden rounded-[10px] border border-line`}
        sizes={size === 'full' ? '64px' : '48px'}
      />
    )
  }
  if (hit.kind === 'blog') {
    return (
      <div
        className={`${box} flex shrink-0 items-center justify-center rounded-[10px] border border-line bg-card text-brand-text`}
        aria-hidden="true"
      >
        <FontAwesomeIcon icon={faPenNib} className={size === 'full' ? 'h-6 w-6' : 'h-5 w-5'} />
      </div>
    )
  }
  if (hit.kind === 'workshop' && hit.icon) {
    return (
      <div
        className={`${box} flex shrink-0 items-center justify-center rounded-[10px] bg-green-pale text-brand-text`}
        aria-hidden="true"
      >
        <ToolIcon name={hit.icon} className={size === 'full' ? 'h-11 w-5 -rotate-12' : 'h-8 w-4 -rotate-12'} />
      </div>
    )
  }
  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-[10px] border border-line bg-fond text-muted`}
      aria-hidden="true"
    >
      <FontAwesomeIcon icon={faFileLines} className={size === 'full' ? 'h-6 w-6' : 'h-5 w-5'} />
    </div>
  )
}

/** What, when, by whom: one quiet line above the title. */
export function hitMeta(hit: SearchHit): string {
  if (hit.kind === 'event' && hit.date) {
    const when = longDate.format(new Date(hit.date))
    return hit.past ? `Event am ${when}, vorbei` : `Event am ${when}`
  }
  if (hit.kind === 'blog') {
    const parts = ['Blog']
    if (hit.date) parts.push(`vom ${longDate.format(new Date(hit.date))}`)
    if (hit.author) parts.push(`von ${hit.author}`)
    return parts.join(' ')
  }
  if (hit.kind === 'workshop') return 'Werkstatt'
  return hit.href === '/' ? 'Startseite' : `Seite ${hit.href}`
}

export function SearchHitRow({
  hit,
  size,
  active = false,
  id,
  onPick,
}: {
  hit: SearchHit
  size: 'quick' | 'full'
  /** keyboard focus in the quick results */
  active?: boolean
  id?: string
  onPick?: () => void
}) {
  return (
    <Link
      id={id}
      href={hit.href}
      onClick={onPick}
      aria-selected={size === 'quick' ? active : undefined}
      role={size === 'quick' ? 'option' : undefined}
      className={`group flex items-start gap-4 rounded-[12px] text-inherit no-underline transition-colors ${
        size === 'full' ? 'px-3 py-4 md:px-4' : 'px-3 py-2.5'
      } ${active ? 'bg-fond' : 'hover:bg-fond'}`}
    >
      <Glyph hit={hit} size={size} />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-sans text-[14px] text-muted">{hitMeta(hit)}</p>
        <p
          className={`m-0 font-sans font-bold leading-snug group-hover:text-brand-text ${
            size === 'full' ? 'text-[18px] md:text-[19px]' : 'text-[16px]'
          }`}
        >
          <Marked segments={hit.title} />
        </p>
        {hit.snippet.length ? (
          <p
            className={`m-0 mt-1 text-[14px] leading-[1.5] text-muted ${size === 'full' ? 'line-clamp-3 md:text-[15px]' : 'line-clamp-2 md:line-clamp-1'}`}
          >
            <Marked segments={hit.snippet} />
          </p>
        ) : null}
      </div>
    </Link>
  )
}
