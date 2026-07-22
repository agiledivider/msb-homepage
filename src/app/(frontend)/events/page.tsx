import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { EventsClient } from '@/components/events/EventsClient'
import { toEventDTO } from '@/components/events/model'
import { getPayloadClient } from '@/lib/getPayload'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const payload = await getPayloadClient()

  // Every published event, past included — the calendar view can page back into
  // previous months, and the upcoming/past split happens client-side so a
  // static snapshot stays correct as time moves past its publish date.
  const res = await payload.find({
    collection: 'events',
    where: { _status: { equals: 'published' } },
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
