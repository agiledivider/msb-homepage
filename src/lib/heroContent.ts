import type { Where } from 'payload'
import { findPublic } from '@/lib/publicData'

/** Not ticked "Nicht im Startseiten-Hero zeigen" (unset counts as shown). */
export const IN_HERO: Where = {
  or: [{ hideFromHero: { equals: false } }, { hideFromHero: { exists: false } }],
}

/**
 * What the start-page hero shows on its blog and event faces: the newest post
 * and the next upcoming event (or, without one, the latest past event), each
 * skipping anything kept out of the hero. `since` is the start of today (Berlin).
 */
export async function heroContent(since: string) {
  const [blog, upcoming] = await Promise.all([
    findPublic({ collection: 'blog', where: IN_HERO, sort: '-publishedAt', limit: 1, depth: 2 }),
    findPublic({
      collection: 'events',
      where: { and: [IN_HERO, { date: { greater_than_equal: since } }] },
      sort: 'date',
      limit: 1,
      depth: 2,
    }),
  ])
  const event =
    upcoming.docs[0] ??
    (await findPublic({ collection: 'events', where: IN_HERO, sort: '-date', limit: 1, depth: 2 })).docs[0]
  return { post: blog.docs[0], event }
}
