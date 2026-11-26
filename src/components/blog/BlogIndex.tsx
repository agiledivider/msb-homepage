import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { Media } from '@/components/Media'
import { CARD_LINK, CARD_TITLE } from '@/components/ui'
import { BLOG_PAGE_SIZE, blogPagePath } from '@/lib/blogPages'
import { postMeta } from '@/lib/postMeta'
import { findPublic } from '@/lib/publicData'

/** The blog list, one page of it: /blog is page 1, /blog/seite/N the older ones (S5.10). */
export async function BlogIndex({ page }: { page: number }) {
  const res = await findPublic({
    collection: 'blog',
    sort: '-publishedAt',
    limit: BLOG_PAGE_SIZE,
    page,
    depth: 2,
  })
  if (page > 1 && res.docs.length === 0) notFound()

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent
        blockType="pageIntro"
        tag="AUS DER WERKSTATT"
        meta={page > 1 ? `Seite ${page} von ${res.totalPages}` : 'Build-Logs · Berichte · Anleitungen'}
        headline="Blog"
        lede="Was wir bauen und wie wir es bauen — Berichte aus der Werkstatt."
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
              <PostByline text={postMeta(post, { readingTime: false })} />
              <h3 className={`m-0 mb-1.5 font-sans text-[19px] font-bold text-ink ${CARD_TITLE}`}>{post.title}</h3>
              {post.excerpt ? (
                <p className="m-0 line-clamp-3 text-[14px] leading-[1.55] text-muted">{post.excerpt}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      <Pager page={page} pages={res.totalPages} />
    </main>
  )
}

/** Date · author above a card's title; nothing when both are unknown. */
function PostByline({ text }: { text: string }) {
  return text ? <div className="mb-2 font-mono text-[14px] text-muted">{text}</div> : null
}

const PAGER_LINK =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-[8px] border border-line bg-card px-3 font-mono text-[14px] text-ink no-underline transition-colors hover:border-brand-text hover:bg-green-pale hover:text-brand-text'

/** "← Neuere · 1 2 3 4 · Ältere →"; on phones only the arrows and "Seite 2 von 4". */
export function Pager({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null
  const numbers = Array.from({ length: pages }, (_, i) => i + 1)
  return (
    <nav aria-label="Weitere Blogbeiträge" className="mt-10 flex flex-wrap items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={blogPagePath(page - 1)} rel="prev" className={PAGER_LINK}>
          ← Neuere
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-[14px] text-muted sm:hidden">
        Seite {page} von {pages}
      </span>
      <ul className="m-0 hidden list-none gap-2 p-0 sm:flex">
        {numbers.map((n) => (
          <li key={n}>
            {n === page ? (
              <span
                aria-current="page"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[8px] bg-brand px-3 font-mono text-[14px] font-bold text-tinte"
              >
                {n}
              </span>
            ) : (
              <Link href={blogPagePath(n)} className={PAGER_LINK} aria-label={`Seite ${n}`}>
                {n}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {page < pages ? (
        <Link href={blogPagePath(page + 1)} rel="next" className={PAGER_LINK}>
          Ältere →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
