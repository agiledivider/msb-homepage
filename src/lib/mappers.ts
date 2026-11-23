import type { EventFeedBlock } from '@/blocks/EventFeed/Component'
import type { EventsListBlock } from '@/blocks/EventsList/Component'
import type { Face } from '@/blocks/Hero/Component'
import type { NavItem } from '@/components/Header'
import type { MediaResource } from '@/components/Media'
import { BERLIN_TZ, eventTimeText } from '@/lib/eventTime'
import type { SocialPlatform } from '@/lib/socialPlatforms'
import type { Blog, Event, HeroSetting, Media, SiteSetting } from '@/payload-types'

// ---- date helpers (German) -------------------------------------------------
// Format in Berlin so day-only event dates never shift with the server timezone.
const de = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN_TZ, ...opts })
const strip = (s: string) => s.replace(/\.$/, '')

const day2 = (d: Date) => de({ day: '2-digit' }).format(d)
const monthLong = (d: Date) => de({ month: 'long' }).format(d).toUpperCase()
const monthShort = (d: Date) => strip(de({ month: 'short' }).format(d)).toUpperCase()
const weekdayLong = (d: Date) => de({ weekday: 'long' }).format(d).toUpperCase()
const weekdayShort = (d: Date) => strip(de({ weekday: 'short' }).format(d)).toUpperCase()
const longDate = (d: Date) => de({ day: 'numeric', month: 'short', year: 'numeric' }).format(d).toUpperCase()

/** A populated upload comes back as an object; an id (number) means unpopulated. */
const asMedia = (v: number | Media | null | undefined): MediaResource =>
  v && typeof v === 'object' ? (v as MediaResource) : undefined

/**
 * URL to use for `og:image` / `twitter:image`.
 *
 * Prefers Payload's generated `hero` (1200px) or `card` (768px) size over the
 * original: social crawlers want roughly 1200px wide, and the original can be a
 * multi-megabyte camera file. It also keeps those originals out of the static
 * bundle, since the publish step only copies media something actually links to.
 * Falls back to the original when Payload skipped the size (it never upscales).
 */
export const socialImageUrl = (v: number | Media | null | undefined): string | undefined => {
  if (!v || typeof v !== 'object') return undefined
  return v.sizes?.hero?.url ?? v.sizes?.card?.url ?? v.url ?? undefined
}

// ---- hero faces ------------------------------------------------------------

/** Face 0 — the editable HeroSettings global maps straight onto the Face shape. */
export function heroToFace(h: HeroSetting): Face {
  return {
    badge: h.badge,
    note: h.note,
    accent: (h.accent as Face['accent']) ?? 'green',
    variant: 'standard',
    eyebrow: h.eyebrow,
    pillLabel: h.pillLabel,
    cornerLabel: h.cornerLabel,
    headline: h.headline,
    lede: h.lede,
    description: h.description,
    primaryStyle: (h.primaryStyle as Face['primaryStyle']) ?? 'white',
    primary: h.primary,
    secondary: h.secondary,
    image: asMedia(h.image),
    imagePlaceholder: h.imagePlaceholder,
    caption: h.caption,
    largePhoto: true, // Falk 2026-11-22: the Werkstatt photo can be bigger on phones
  }
}

/** Face 1 — latest blog post. */
export function blogToFace(post: Blog): Face {
  const meta = [post.author, post.publishedAt ? longDate(new Date(post.publishedAt)) : null, post.readingTime]
    .filter(Boolean)
    .map((value) => ({ value: value as string }))
  return {
    badge: post.badge ?? 'NEU IM BLOG',
    note: 'frisch dokumentiert ✦',
    accent: 'orange',
    variant: 'standard',
    eyebrow: '✎ AUS DER WERKSTATT · BLOG',
    pillLabel: 'BLOG',
    cornerLabel: `#${post.id ?? ''}`,
    headline: post.title,
    lede: post.subtitle,
    description: post.excerpt,
    meta,
    primaryStyle: 'orange',
    primary: { label: 'Beitrag lesen', url: `/blog/${post.slug}` },
    secondary: { label: 'Alle Beiträge', url: '/blog' },
    image: asMedia(post.cover),
    imagePlaceholder: 'Foto zum Blogbeitrag',
    caption: 'Logbuch',
  }
}

/** Face 2 — next upcoming event. */
export function eventToFace(ev: Event): Face {
  const d = new Date(ev.date)
  return {
    badge: `${weekdayShort(d)} ${day2(d)}. ${monthLong(d)}`,
    note: 'kostenlos ✦',
    accent: 'green',
    variant: 'event',
    eyebrow: '◆ NÄCHSTER TERMIN · EVENT',
    pillLabel: 'EVENT',
    // No corner label on the event face (Falk 2026-11-22: the time in the corner can go).
    eventDay: day2(d),
    eventMonth: monthLong(d),
    eventWeekday: weekdayLong(d),
    headline: ev.title,
    lede: ev.subtitle,
    description: ev.description,
    primaryStyle: 'white',
    primary: { label: 'Platz sichern', url: `/events/${ev.slug}` },
    secondary: { label: 'Alle Events', url: '/events' },
    image: asMedia(ev.image),
    imagePlaceholder: 'Foto vom Event',
    caption: ev.location ?? 'Kennedyallee 18',
  }
}

/** Static fallbacks so the hero always has exactly 3 faces. */
export const fallbackBlogFace: Face = {
  badge: 'BLOG',
  accent: 'orange',
  eyebrow: '✎ AUS DER WERKSTATT · BLOG',
  pillLabel: 'BLOG',
  headline: 'Bald mehr\naus der Werkstatt.',
  lede: 'Der erste Beitrag ist in Arbeit.',
  primary: { label: 'Zum Blog', url: '/blog' },
  imagePlaceholder: 'Foto zum Blogbeitrag',
  caption: 'Logbuch',
}

export const fallbackEventFace: Face = {
  badge: 'EVENTS',
  accent: 'green',
  variant: 'standard',
  eyebrow: '◆ TERMINE · EVENT',
  pillLabel: 'EVENT',
  headline: 'Demnächst\nwieder offene Tür.',
  lede: 'Neue Termine folgen in Kürze.',
  primary: { label: 'Alle Events', url: '/events' },
  imagePlaceholder: 'Foto von der Offenen Tür',
  caption: 'Offene Tür',
}

// ---- event feed / list -----------------------------------------------------

export function eventsToFeed(events: Event[]): EventFeedBlock['events'] {
  return events.map((e) => {
    const d = new Date(e.date)
    return {
      day: day2(d),
      sub: `${monthShort(d)} · ${weekdayShort(d)}`,
      tag: e.category,
      tagColor: e.tagColor,
      title: e.title,
      text: e.description,
      link: { url: `/events/${e.slug}` },
    }
  })
}

export function eventsToList(events: Event[]): EventsListBlock['events'] {
  return events.map((e) => {
    const d = new Date(e.date)
    return {
      day: day2(d),
      sub: `${monthShort(d)} · ${weekdayShort(d)}`,
      tag: e.category,
      tagColor: e.tagColor,
      time: eventTimeText(e.timeLabel),
      title: e.title,
      text: e.description,
      link: { url: `/events/${e.slug}` },
    }
  })
}

// ---- site chrome -----------------------------------------------------------

export function navFrom(site?: SiteSetting | null): NavItem[] | undefined {
  const items = site?.nav?.flatMap((n) => (n.label && n.url ? [{ label: n.label, href: n.url }] : []))
  return items?.length ? items : undefined
}

export function ctaFrom(site?: SiteSetting | null): NavItem | undefined {
  const c = site?.headerCta
  return c?.label && c?.url ? { label: c.label, href: c.url } : undefined
}

/** Footer contact + community from Website-Einstellungen; empty fields fall back to the footer's defaults. */
export function footerFrom(site?: SiteSetting | null): {
  tagline?: string
  phone?: string
  email?: string
  social: { platform: SocialPlatform; url: string }[]
} {
  const f = site?.footer
  return {
    tagline: f?.tagline?.trim() || undefined,
    phone: f?.phone?.trim() || undefined,
    email: f?.email?.trim() || undefined,
    social: (f?.social ?? []).filter((x) => x.platform && x.url).map((x) => ({ platform: x.platform, url: x.url })),
  }
}

export function footerLinksFrom(site?: SiteSetting | null): NavItem[] | undefined {
  const items = site?.footer?.links?.flatMap((l) => (l.label && l.url ? [{ label: l.label, href: l.url }] : []))
  return items?.length ? items : undefined
}
