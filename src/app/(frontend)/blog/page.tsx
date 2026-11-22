import Link from 'next/link'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { Media } from '@/components/Media'
import { CARD_LINK, CARD_TITLE } from '@/components/ui'
import { findPublic } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

export default async function BlogIndexPage() {
  const res = await findPublic({
    collection: 'blog',
    sort: '-publishedAt',
    limit: 20,
    depth: 2,
  })

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent
        blockType="pageIntro"
        tag="AUS DER WERKSTATT"
        meta="Build-Logs · Berichte · Anleitungen"
        headline="Blog"
        lede="What we build, how we build it — logs from the workshop."
      />
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {res.docs.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className={`${CARD_LINK} overflow-hidden rounded-[14px] border border-line bg-card shadow-[0_18px_40px_-28px_rgba(60,52,30,.4)]`}
          >
            <Media
              resource={typeof post.cover === 'object' ? post.cover : undefined}
              placeholder={post.title}
              className="h-[180px] w-full"
              sizes="(max-width:640px) 100vw, 380px"
            />
            <div className="p-5">
              <h3 className={`m-0 mb-1.5 font-sans text-[19px] font-bold text-ink ${CARD_TITLE}`}>{post.title}</h3>
              {post.excerpt ? (
                <p className="m-0 line-clamp-3 text-[14px] leading-[1.55] text-muted">{post.excerpt}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
