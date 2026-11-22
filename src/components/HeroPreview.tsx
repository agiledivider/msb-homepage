import { type Face, HeroComponent } from '@/blocks/Hero/Component'
import { getPayloadClient } from '@/lib/getPayload'
import { blogToFace, eventToFace, fallbackBlogFace, fallbackEventFace, heroToFace } from '@/lib/mappers'
import { findPublic } from '@/lib/publicData'
import type { Blog, Event } from '@/payload-types'

type Props = {
  /** The doc being edited/previewed; it takes its slot in the carousel. */
  edited: { collection: 'blog'; doc: Blog | undefined } | { collection: 'events'; doc: Event | undefined }
  /** Read the hero global's draft (only under a verified CMS session). */
  draftGlobal: boolean
  /** Rendered inside the mobile iframe: just the hero. */
  bare: boolean
  /** Same page with bare=1, for the 390 px iframe. */
  mobileSrc: string
}

/**
 * How a blog post / event looks in the homepage hero carousel: the real 3-face
 * hero with the previewed doc in its slot, desktop plus a 390 px mobile frame.
 * The other faces are what's live.
 */
export async function HeroPreview({ edited, draftGlobal, bare, mobileSrc }: Props) {
  const payload = await getPayloadClient()
  const now = new Date().toISOString()
  const hero = await payload.findGlobal({ slug: 'heroSettings', depth: 2, draft: draftGlobal })

  let blogFace: Face
  let eventFace: Face
  let initialFace: number

  if (edited.collection === 'blog') {
    blogFace = edited.doc ? blogToFace(edited.doc) : fallbackBlogFace
    const ev = await findPublic({
      collection: 'events',
      where: { date: { greater_than_equal: now } },
      sort: 'date',
      limit: 1,
      depth: 2,
    })
    eventFace = ev.docs[0] ? eventToFace(ev.docs[0]) : fallbackEventFace
    initialFace = 1
  } else {
    eventFace = edited.doc ? eventToFace(edited.doc) : fallbackEventFace
    const bl = await findPublic({ collection: 'blog', sort: '-publishedAt', limit: 1, depth: 2 })
    blogFace = bl.docs[0] ? blogToFace(bl.docs[0]) : fallbackBlogFace
    initialFace = 2
  }

  const faces: Face[] = [heroToFace(hero), blogFace, eventFace]

  // The iframe's 390px viewport makes the CSS md: breakpoints + isMobile resolve to the real mobile layout.
  if (bare) {
    return (
      <main className="px-3 py-5">
        <HeroComponent faces={faces} initialFace={initialFace} autoPlay={false} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-shell px-4 pb-16 pt-6 md:px-8">
      <div className="mb-2 font-mono text-[14px] tracking-[.08em] text-muted">DESKTOP</div>
      <HeroComponent faces={faces} initialFace={initialFace} autoPlay={false} />

      <div className="mb-3 mt-12 font-mono text-[14px] tracking-[.08em] text-muted">MOBIL · 390 px</div>
      <iframe
        src={mobileSrc}
        title="Mobile Hero-Vorschau"
        className="mx-auto block w-[390px] max-w-full rounded-[26px] border-[8px] border-ink/85 bg-paper shadow-[0_30px_70px_-30px_rgba(0,0,0,.5)]"
        style={{ height: 760 }}
      />
    </main>
  )
}
