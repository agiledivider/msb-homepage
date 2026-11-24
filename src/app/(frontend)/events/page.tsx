import type { Metadata } from 'next'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { EventsClient } from '@/components/events/EventsClient'
import { toEventDTO } from '@/components/events/model'
import { findPublic } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Events & Workshops',
  description:
    'Workshops, offene Türen und Treffs im MakerSpace Bonn: vorbeikommen, etwas lernen, die Community treffen.',
}

export default async function EventsPage() {
  // Every published event, past included — the calendar view can page back into
  // previous months, and the upcoming/past split happens client-side so a
  // static snapshot stays correct as time moves past its publish date.
  const res = await findPublic({
    collection: 'events',
    sort: 'date',
    limit: 2000,
    depth: 1,
  })

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent
        blockType="pageIntro"
        tag="TERMINE"
        meta="Workshops · offene Türen · Treffs"
        headline="Events & Workshops"
        lede="Come by, learn something, meet the community."
      />
      <EventsClient events={res.docs.map(toEventDTO)} nowIso={new Date().toISOString()} />
    </main>
  )
}
