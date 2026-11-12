import { notFound } from 'next/navigation'
import { type MsbBlock, RenderBlocks } from '@/components/RenderBlocks'
import { findBySlug } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await findBySlug('pages', slug, 2)
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout as unknown as MsbBlock[]} />
}
