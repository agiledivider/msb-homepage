import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventArticle } from '@/components/Article'
import { socialImageUrl } from '@/lib/mappers'
import { findBySlug } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const ev = await findBySlug('events', slug, 1)
  if (!ev) return {}
  const description = ev.description || undefined
  const image = socialImageUrl(ev.image)
  const url = `/events/${ev.slug}`
  return {
    title: ev.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: ev.title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
    },
  }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ev = await findBySlug('events', slug, 2)
  if (!ev) notFound()
  return <EventArticle ev={ev} />
}
