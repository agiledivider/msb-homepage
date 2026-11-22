import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogArticle, EventArticle } from '@/components/Article'
import { HeroPreview } from '@/components/HeroPreview'
import { findByPreviewToken } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

// The token is in the URL: keep it out of search engines and out of Referer headers.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' }

const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * Preview of one draft through a signed, short-lived link (MCP tool
 * `previewLink`): the hero carousel (desktop + mobile) and the article page as
 * they would go live. Needs no CMS session and enables no draft mode, so only
 * the document named in the token is shown as a draft.
 */
export default async function PreviewLinkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const token = pick(sp.t) ?? ''
  const bare = pick(sp.bare) === '1'
  const found = await findByPreviewToken(token, new Date())
  if (!found) notFound()

  const mobileSrc = `/preview/link?t=${encodeURIComponent(token)}&bare=1`
  const hero = <HeroPreview edited={found} draftGlobal={false} bare={bare} mobileSrc={mobileSrc} />
  if (bare) return hero

  return (
    <>
      <div className="bg-ink px-4 py-2 text-center font-mono text-[12px] tracking-[.06em] text-white">
        VORSCHAU · ENTWURF · NICHT ÖFFENTLICH
      </div>
      {hero}
      <div className="mx-auto max-w-shell px-4 font-mono text-[11.5px] tracking-[.08em] text-faint md:px-8">
        {found.collection === 'blog' ? 'BLOGBEITRAG' : 'EVENT-SEITE'}
      </div>
      {found.collection === 'blog' ? <BlogArticle post={found.doc} /> : <EventArticle ev={found.doc} />}
    </>
  )
}
