import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/getPayload'
import { RenderBlocks, type MsbBlock } from '@/components/RenderBlocks'

export const dynamic = 'force-dynamic'

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  const page = res.docs[0]
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout as unknown as MsbBlock[]} />
}
