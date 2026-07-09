import { draftMode } from 'next/headers'
import { type Face, HeroComponent } from '@/blocks/Hero/Component'
import { getPayloadClient } from '@/lib/getPayload'
import { blogToFace, eventToFace, fallbackBlogFace, fallbackEventFace, heroToFace } from '@/lib/mappers'
import type { Blog, Event } from '@/payload-types'

export const dynamic = 'force-dynamic'

const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * Live-preview of how a blog post / event looks in the homepage hero carousel.
 * Renders the real 3-face hero with the edited (draft) doc in its slot and starts
 * on that face. Used as the admin livePreview URL for blog & events.
 */
export default async function HeroPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const collection = pick(sp.collection) === 'events' ? 'events' : 'blog'
  const slug = pick(sp.slug)
  const bare = pick(sp.bare) === '1' // rendered inside the mobile iframe (hero only)

  const { isEnabled: draft } = await draftMode()
  const payload = await getPayloadClient()
  const now = new Date().toISOString()

  const hero = await payload.findGlobal({ slug: 'heroSettings', depth: 2, draft })

  const edited = slug
    ? (
        await payload.find({
          collection,
          where: { slug: { equals: slug } },
          limit: 1,
          depth: 2,
          draft,
          overrideAccess: draft,
        })
      ).docs[0]
    : undefined

  let blogFace: Face
  let eventFace: Face
  let initialFace: number

  if (collection === 'blog') {
    blogFace = edited ? blogToFace(edited as unknown as Blog) : fallbackBlogFace
    const ev = await payload.find({
      collection: 'events',
      where: { and: [{ _status: { equals: 'published' } }, { date: { greater_than_equal: now } }] },
      sort: 'date',
      limit: 1,
      depth: 2,
    })
    eventFace = ev.docs[0] ? eventToFace(ev.docs[0]) : fallbackEventFace
    initialFace = 1
  } else {
    eventFace = edited ? eventToFace(edited as unknown as Event) : fallbackEventFace
    const bl = await payload.find({
      collection: 'blog',
      where: { _status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: 1,
      depth: 2,
    })
    blogFace = bl.docs[0] ? blogToFace(bl.docs[0]) : fallbackBlogFace
    initialFace = 2
  }

  const faces: Face[] = [heroToFace(hero), blogFace, eventFace]

  // Rendered inside the mobile iframe: just the hero (the iframe's 390px viewport
  // makes the CSS md: breakpoints + isMobile resolve to the real mobile layout).
  if (bare) {
    return (
      <main className="px-3 py-5">
        <HeroComponent faces={faces} initialFace={initialFace} autoPlay={false} />
      </main>
    )
  }

  const mobileSrc = `/preview/hero?collection=${collection}&slug=${encodeURIComponent(slug ?? '')}&bare=1`

  return (
    <main className="mx-auto max-w-shell px-4 pb-16 pt-6 md:px-8">
      <div className="mb-2 font-mono text-[11.5px] tracking-[.08em] text-faint">DESKTOP</div>
      <HeroComponent faces={faces} initialFace={initialFace} autoPlay={false} />

      <div className="mb-3 mt-12 font-mono text-[11.5px] tracking-[.08em] text-faint">MOBIL · 390 px</div>
      <iframe
        src={mobileSrc}
        title="Mobile Hero-Vorschau"
        className="mx-auto block w-[390px] max-w-full rounded-[26px] border-[8px] border-ink/85 bg-paper shadow-[0_30px_70px_-30px_rgba(0,0,0,.5)]"
        style={{ height: 760 }}
      />
    </main>
  )
}
