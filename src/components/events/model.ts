import type { MediaResource } from '@/components/Media'
import { BERLIN_TZ, eventTimeText } from '@/lib/eventTime'
import type { Event, Media } from '@/payload-types'

/** Page size for the list & tiles views (first batch rendered, rest revealed on scroll). */
export const PER_PAGE = 9

/** The three /events layouts. */
export const VIEWS = ['list', 'tiles', 'calendar'] as const
export type ViewKey = (typeof VIEWS)[number]
export const isViewKey = (v: string | null | undefined): v is ViewKey => (VIEWS as readonly string[]).includes(v ?? '')

/** Flattened event shape shared by all three /events views. */
export type EventVM = {
  id: number
  title: string
  subtitle?: string | null
  href: string
  date: Date
  time: string
  location?: string | null
  category?: string | null
  tagColor?: string | null
  description?: string | null
  image?: MediaResource
}

/**
 * Wire form of an `EventVM`: identical except `date` is an ISO string.
 *
 * The /events page hands its whole event set to a client component and the
 * publish step writes the same shape to `events-index.json`, so the two share
 * one JSON-safe type instead of each inventing a serialization.
 */
export type EventDTO = Omit<EventVM, 'date'> & { date: string }

const asMedia = (v: number | Media | null | undefined): MediaResource =>
  v && typeof v === 'object' ? (v as MediaResource) : undefined

// Format day-only dates in Berlin so the label never shifts with the server TZ.
const de = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN_TZ, ...opts })
const strip = (s: string) => s.replace(/\.$/, '')

export function toEventVM(e: Event): EventVM {
  const date = new Date(e.date)
  return {
    id: e.id,
    title: e.title,
    subtitle: e.subtitle,
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

/** `toEventVM` with the date flattened to ISO — safe to JSON-serialize. */
export const toEventDTO = (e: Event): EventDTO => {
  const { date, ...rest } = toEventVM(e)
  return { ...rest, date: date.toISOString() }
}

/** Inverse of `toEventDTO`. */
export const hydrateEvent = (d: EventDTO): EventVM => ({ ...d, date: new Date(d.date) })

// ---- German date formatting helpers (shared by the views) ------------------
export const fmtDay2 = (d: Date) => de({ day: '2-digit' }).format(d)
export const fmtMonthShort = (d: Date) => strip(de({ month: 'short' }).format(d)).toUpperCase()
export const fmtWeekdayShort = (d: Date) => strip(de({ weekday: 'short' }).format(d)).toUpperCase()
export const fmtMonthYear = (d: Date) => de({ month: 'long', year: 'numeric' }).format(d)
