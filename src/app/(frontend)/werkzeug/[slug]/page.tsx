import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WorkshopPage } from '@/components/WorkshopPage'
import { startOfTodayBerlin } from '@/lib/eventTime'
import { socialImageUrl } from '@/lib/mappers'
import { findBySlug, findForRequest } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const w = await findBySlug('workshops', slug, 1)
  if (!w) return {}
  const title = `${w.title} · Werkstatt`
  const description = w.promise || w.verbs || undefined
  const image = socialImageUrl(w.cover)
  const url = `/werkzeug/${w.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: image ? [{ url: image }] : undefined },
  }
}

export default async function WorkshopRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const workshop = await findBySlug('workshops', slug, 1)
  if (!workshop) notFound()
  const mine = { workshops: { contains: workshop.id } }
  const [all, events, posts] = await Promise.all([
    findForRequest({ collection: 'workshops', sort: 'order', limit: 50, depth: 0 }),
    findForRequest({
      collection: 'events',
      where: { and: [mine, { date: { greater_than_equal: startOfTodayBerlin().toISOString() } }] },
      sort: 'date',
      limit: 3,
      depth: 0,
    }),
    findForRequest({ collection: 'blog', where: mine, sort: '-publishedAt', limit: 3, depth: 1 }),
  ])
  return (
    <WorkshopPage
      workshop={workshop}
      others={all.docs.filter((w) => w.id !== workshop.id)}
      events={events.docs}
      posts={posts.docs}
    />
  )
}
