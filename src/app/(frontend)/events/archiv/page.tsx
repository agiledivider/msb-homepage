import type { Metadata } from 'next'
import Link from 'next/link'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { ListView } from '@/components/events/ListView'
import { groupByYear, toEventVM } from '@/components/events/model'
import { MONO_LINK, SectionHeading } from '@/components/ui'
import { startOfTodayBerlin } from '@/lib/eventTime'
import { findPublic } from '@/lib/publicData'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Event-Archiv — vergangene Termine',
  description: 'Rückblick auf vergangene Workshops, offene Türen, Treffs und Gast-Veranstaltungen im MakerSpace Bonn.',
}

export default async function EventsArchivePage() {
  // Same Berlin start-of-day cutoff as "upcoming" — an event is in exactly one
  // bucket, and today's events stay out of the archive until Berlin midnight.
  const cutoff = startOfTodayBerlin().toISOString()

  const res = await findPublic({
    collection: 'events',
    where: { date: { less_than: cutoff } },
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
        lede="Ein Blick zurück auf vergangene Workshops, Tage der offenen Tür und Treffen im MakerSpace."
      />
      <div className="mb-8 mt-6">
        <Link href="/events" className={MONO_LINK}>
          ← Kommende Events
        </Link>
      </div>
      {events.length ? (
        // One section per year, newest first, so the archive reads as a timeline (S5.16).
        groupByYear(events).map((g) => (
          <section key={g.year} aria-labelledby={`jahr-${g.year}`} className="mb-12 last:mb-0">
            <SectionHeading
              heading={g.year}
              meta={g.events.length === 1 ? '1 Event' : `${g.events.length} Events`}
              headingId={`jahr-${g.year}`}
              className="mb-4"
            />
            <ListView events={g.events} showYear />
          </section>
        ))
      ) : (
        <p className="py-16 text-center font-mono text-sm text-muted">Noch keine vergangenen Termine.</p>
      )}
    </main>
  )
}
