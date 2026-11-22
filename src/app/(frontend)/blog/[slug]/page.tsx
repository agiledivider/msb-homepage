import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogArticle } from '@/components/Article'
import { socialImageUrl } from '@/lib/mappers'
import { findBySlug } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await findBySlug('blog', slug, 1)
  if (!post) return {}
  const description = post.excerpt || post.subtitle || undefined
  const image = socialImageUrl(post.cover)
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
  const post = await findBySlug('blog', slug, 2)
  if (!post) notFound()
  return <BlogArticle post={post} />
}
