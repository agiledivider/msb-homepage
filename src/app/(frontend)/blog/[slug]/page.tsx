import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { getPayloadClient } from '@/lib/getPayload'
import { Media } from '@/components/Media'
import { polaroidConverters } from '@/blocks/PolaroidCard/converter'

export const dynamic = 'force-dynamic'

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'blog',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    draft,
    overrideAccess: draft,
  })
  const post = res.docs[0]
  if (!post) notFound()

  const meta = [post.author, post.readingTime].filter(Boolean).join(' · ')

  return (
    <main className="mx-auto max-w-[760px] px-4 py-14 md:px-8">
      <div className="mb-3 font-mono text-[12px] tracking-[.06em] text-green">AUS DER WERKSTATT · BLOG</div>
      <h1 className="m-0 mb-3 font-display text-[clamp(28px,5vw,44px)] font-black leading-[1.04] tracking-[-.02em]">
        {post.title}
      </h1>
      {post.subtitle ? (
        <p className="m-0 mb-4 font-serif text-[20px] italic text-[#7c766a]">{post.subtitle}</p>
      ) : null}
      {meta ? <div className="mb-8 font-mono text-[12px] text-faint">{meta}</div> : null}
      {post.cover && typeof post.cover === 'object' ? (
        <Media
          resource={post.cover}
          placeholder={post.title}
          className="mb-8 h-[380px] w-full overflow-hidden rounded-[14px]"
          sizes="(max-width:760px) 100vw, 760px"
        />
      ) : null}
      {post.body ? (
        <div className="text-[17px] leading-[1.7] text-[#332f28] [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-bold [&_p]:mb-4">
          <RichText data={post.body as SerializedEditorState} converters={polaroidConverters} />
        </div>
      ) : null}
    </main>
  )
}
