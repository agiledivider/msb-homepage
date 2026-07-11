import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { ListView } from '@/components/events/ListView'
import { toEventVM } from '@/components/events/model'
import { startOfTodayBerlin } from '@/lib/eventTime'
import { getPayloadClient } from '@/lib/getPayload'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Event-Archiv — vergangene Termine',
  description: 'Rückblick auf vergangene Workshops, offene Türen, Treffs und Gast-Veranstaltungen im MakerSpace Bonn.',
}

export default async function EventsArchivePage() {
  const payload = await getPayloadClient()
  // Same Berlin start-of-day cutoff as "upcoming" — an event is in exactly one
  // bucket, and today's events stay out of the archive until Berlin midnight.
  const cutoff = startOfTodayBerlin().toISOString()

  const where: Where = {
    and: [{ _status: { equals: 'published' } }, { date: { less_than: cutoff } }],
  }
  const res = await payload.find({
    collection: 'events',
    where,
    sort: '-date', // most recent past event first
    limit: 500,
    depth: 1,
  })
  const events = res.docs.map(toEventVM)

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent
        blockType="pageIntro"
        tag="ARCHIV"
        meta="Vergangene Termine"
        headline="Event-Archiv"
        lede="A look back at past workshops, open days and meetups at the MakerSpace."
      />
      <div className="mb-8 mt-6">
        <Link href="/events" className="font-mono text-[13px] text-brand-text no-underline hover:underline">
          ← Kommende Events
        </Link>
      </div>
      {events.length ? (
        <ListView events={events} />
      ) : (
        <p className="py-16 text-center font-mono text-sm text-muted">Noch keine vergangenen Termine.</p>
      )}
    </main>
  )
}
