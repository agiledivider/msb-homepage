import { BERLIN_TZ } from './eventTime'

/**
 * The byline under a blog post's title and on its card in the blog list (S5.13):
 * "22. August 2017 · Heribert · 6 MIN". Missing parts are left out, never shown
 * as placeholders. The date is the Berlin day, so a post published just after
 * midnight doesn't show the day before.
 */

const dateFmt = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: BERLIN_TZ,
})

/** "22. August 2017", or null for a missing or unreadable date. */
export function postDate(publishedAt: string | null | undefined): string | null {
  if (!publishedAt) return null
  const d = new Date(publishedAt)
  return Number.isNaN(d.getTime()) ? null : dateFmt.format(d)
}

type PostLike = { publishedAt?: string | null; author?: string | null; readingTime?: string | null }

export function postMeta(post: PostLike, { readingTime = true } = {}): string {
  return [postDate(post.publishedAt), post.author?.trim(), readingTime ? post.readingTime?.trim() : null]
    .filter(Boolean)
    .join(' · ')
}
