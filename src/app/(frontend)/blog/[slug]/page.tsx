import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { richTextConverters } from '@/blocks/richtext'
import { Media } from '@/components/Media'
import { getPayloadClient } from '@/lib/getPayload'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'blog', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  const post = res.docs[0]
  if (!post) return {}
  const description = post.excerpt || post.subtitle || undefined
  const image = post.cover && typeof post.cover === 'object' ? post.cover.url : undefined
  const url = `/blog/${post.slug}`
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
    },
  }
}

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
      {post.subtitle ? <p className="m-0 mb-4 font-serif text-[20px] italic text-[#7c766a]">{post.subtitle}</p> : null}
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
        <div className="text-[17px] leading-[1.7] text-[#332f28] [&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:font-display [&_h3]:text-[18px] [&_h3]:font-bold [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
          <RichText data={post.body as SerializedEditorState} converters={richTextConverters} />
        </div>
      ) : null}
    </main>
  )
}
