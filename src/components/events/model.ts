import type { MediaResource } from '@/components/Media'
import { eventTimeText } from '@/lib/eventTime'
import type { Event, Media } from '@/payload-types'

/** Page size for the list & tiles views (SSR first page + client append). */
export const PER_PAGE = 9

/** Flattened event shape shared by all three /events views. */
export type EventVM = {
  id: number
  title: string
  href: string
  date: Date
  time: string
  location?: string | null
  category?: string | null
  tagColor?: string | null
  description?: string | null
  image?: MediaResource
}

const asMedia = (v: number | Media | null | undefined): MediaResource =>
  v && typeof v === 'object' ? (v as MediaResource) : undefined

const de = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('de-DE', opts)
const strip = (s: string) => s.replace(/\.$/, '')

export function toEventVM(e: Event): EventVM {
  const date = new Date(e.date)
  return {
    id: e.id,
    title: e.title,
    href: `/events/${e.slug ?? e.id}`,
    date,
    time: eventTimeText(e.timeLabel),
    location: e.location,
    category: e.category,
    tagColor: e.tagColor,
    description: e.description,
    image: asMedia(e.image),
  }
}

// ---- German date formatting helpers (shared by the views) ------------------
export const fmtDay2 = (d: Date) => de({ day: '2-digit' }).format(d)
export const fmtMonthShort = (d: Date) => strip(de({ month: 'short' }).format(d)).toUpperCase()
export const fmtWeekdayShort = (d: Date) => strip(de({ weekday: 'short' }).format(d)).toUpperCase()
export const fmtMonthYear = (d: Date) => de({ month: 'long', year: 'numeric' }).format(d)
