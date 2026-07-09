import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { type MsbBlock, RenderBlocks } from '@/components/RenderBlocks'
import { getPayloadClient } from '@/lib/getPayload'

export const dynamic = 'force-dynamic'

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    draft,
    overrideAccess: draft,
  })
  const page = res.docs[0]
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout as unknown as MsbBlock[]} />
}
