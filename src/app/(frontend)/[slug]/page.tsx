import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { type MsbBlock, RenderBlocks } from '@/components/RenderBlocks'
import { findBySlug } from '@/lib/publicData'
import { pageDescription, pagePath } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await findBySlug('pages', slug, 0)
  if (!page) return {}
  const description = pageDescription(page.layout)
  const url = pagePath(page.slug ?? slug)
  return {
    title: page.title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: page.title, description, url },
  }
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await findBySlug('pages', slug, 2)
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout as unknown as MsbBlock[]} />
}
