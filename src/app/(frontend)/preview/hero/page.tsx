import { draftMode } from 'next/headers'
import { HeroPreview } from '@/components/HeroPreview'
import { findForRequest } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * Live-preview of how a blog post / event, or the hero settings' own face
 * (collection=hero), look in the homepage hero carousel.
 * Used as the admin livePreview URL for blog & events (draft mode via the CMS
 * session). Claude uses the signed /preview/link instead.
 */
export default async function HeroPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const c = pick(sp.collection)
  const collection = c === 'events' || c === 'hero' ? c : 'blog'
  const slug = pick(sp.slug)
  const bare = pick(sp.bare) === '1'
  const { isEnabled: draft } = await draftMode()

  const where = { slug: { equals: slug ?? '' } }
  const edited =
    collection === 'hero'
      ? { collection: 'hero' as const }
      : collection === 'events'
        ? {
            collection: 'events' as const,
            doc: slug ? (await findForRequest({ collection: 'events', where, limit: 1, depth: 2 })).docs[0] : undefined,
          }
        : {
            collection: 'blog' as const,
            doc: slug ? (await findForRequest({ collection: 'blog', where, limit: 1, depth: 2 })).docs[0] : undefined,
          }

  const mobileSrc = `/preview/hero?collection=${collection}&slug=${encodeURIComponent(slug ?? '')}&bare=1`
  return <HeroPreview edited={edited} draftGlobal={draft} bare={bare} mobileSrc={mobileSrc} />
}
