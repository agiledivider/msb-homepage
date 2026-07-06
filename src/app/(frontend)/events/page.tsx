import { getPayloadClient } from '@/lib/getPayload'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { EventsListComponent } from '@/blocks/EventsList/Component'
import { eventsToList } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'events',
    where: { _status: { equals: 'published' } },
    sort: '-date',
    limit: 30,
    depth: 2,
  })

  const events = eventsToList(res.docs)
  const bigEvents = res.docs.slice(0, 2).map((e) => ({
    title: e.title,
    meta: e.location ?? undefined,
  }))

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent
        blockType="pageIntro"
        tag="TERMINE"
        meta="Workshops · offene Türen · Treffs"
        headline="Events & Workshops"
        lede="Come by, learn something, meet the community."
      />
      <div className="mt-8">
        <EventsListComponent
          blockType="eventsList"
          events={events}
          sidebar={{
            bigTitle: 'GRÖSSERE EVENTS',
            bigEvents,
            infoTitle: 'Neu hier?',
            infoText: 'Die Offene Tür ist der beste Einstieg — kostenlos & ohne Anmeldung.',
            infoLink: { label: 'Mitmachen →', url: '/mitmachen' },
          }}
        />
      </div>
    </main>
  )
}
