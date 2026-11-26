import { draftMode } from 'next/headers'
import { CtaBandComponent } from '@/blocks/CtaBand/Component'
import { EventFeedSidebar } from '@/blocks/EventFeed/Sidebar'
import { type Face, HeroComponent } from '@/blocks/Hero/Component'
import { WorkshopsComponent } from '@/blocks/Workshops/Component'
import { toEventDTO } from '@/components/events/model'
import { UpcomingList } from '@/components/events/UpcomingList'
import { SectionHeading } from '@/components/ui'
import { startOfTodayBerlin } from '@/lib/eventTime'
import { getPayloadClient } from '@/lib/getPayload'
import { blogToFace, eventToFace, fallbackBlogFace, fallbackEventFace, heroToFace } from '@/lib/mappers'
import { loadOpeningHours, pickHourRows } from '@/lib/openingHours'
import { findPublic } from '@/lib/publicData'

export const dynamic = 'force-dynamic' // always reflect the latest content

/**
 * Rows for the Öffnungszeiten box (S5.12): the calendar feed from the site
 * settings, else the editors' fallback rows. The feed URL may be secret, so it
 * is read here on the server (local API, full access) and never passed on.
 */
async function openingHoursRows() {
  const payload = await getPayloadClient()
  const site = await payload.findGlobal({ slug: 'siteSettings', depth: 0 }).catch(() => null)
  const url = site?.openingHours?.icsUrl
  const show = site?.openingHours?.show ?? 'all'
  const live = await loadOpeningHours(url, { now: new Date(), show }).catch(() => null)
  // Never log the URL itself: it may be a secret address.
  if (url && live === null)
    payload.logger.warn('opening hours: calendar link gives no usable feed, showing fallback rows')
  return pickHourRows(live, site?.openingHours?.fallback)
}

export default async function StartPage() {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayloadClient()
  // Day-only events stay "upcoming" for their whole Berlin day (see eventTime).
  const since = startOfTodayBerlin().toISOString()

  const [hero, blogRes, upcomingRes, feedRes, hours] = await Promise.all([
    payload.findGlobal({ slug: 'heroSettings', depth: 2, draft }),
    findPublic({
      collection: 'blog',
      sort: '-publishedAt',
      limit: 1,
      depth: 2,
    }),
    findPublic({
      collection: 'events',
      where: { date: { greater_than_equal: since } },
      sort: 'date',
      limit: 1,
      depth: 2,
    }),
    // Deeper than the 5 displayed: the feed re-filters against the real clock in
    // the browser, so a published bundle needs spare events to fall back on.
    findPublic({
      collection: 'events',
      where: { date: { greater_than_equal: since } },
      sort: 'date',
      limit: 25,
      depth: 2,
    }),
    openingHoursRows(),
  ])

  // fallback: if nothing upcoming, use the most recent past event
  let nextEvent = upcomingRes.docs[0]
  if (!nextEvent) {
    const past = await findPublic({
      collection: 'events',
      sort: '-date',
      limit: 1,
      depth: 2,
    })
    nextEvent = past.docs[0]
  }

  // ALWAYS exactly 3 faces (the carousel requires it)
  const faces: Face[] = [
    heroToFace(hero),
    blogRes.docs[0] ? blogToFace(blogRes.docs[0]) : fallbackBlogFace,
    nextEvent ? eventToFace(nextEvent) : fallbackEventFace,
  ]

  const feedEvents = feedRes.docs.map(toEventDTO)

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <HeroComponent faces={faces} />

      <section className="grid grid-cols-1 items-start gap-10 pt-14 first:pt-0 lg:grid-cols-[1fr_340px]">
        <div>
          <SectionHeading
            tag="PINNWAND"
            heading="Was läuft"
            link={{ label: 'alle Events →', url: '/events' }}
            className="mb-4"
          />
          <UpcomingList events={feedEvents} nowIso={new Date().toISOString()} limit={5} />
        </div>

        <EventFeedSidebar
          sidebar={{
            hoursTitle: 'Öffnungszeiten',
            hoursBadge: 'NÄCHSTE 14 TAGE',
            hours,
            hoursFootnote: '„Offen" = für Mitglieder. Die Offene Tür ist für alle & kostenlos.',
            infoEyebrow: 'NEU HIER?',
            infoText: 'Komm einfach zur Offenen Tür — unverbindliche Führung durch alle Werkstätten inklusive.',
            infoLink: { label: 'Mehr über uns →', url: '/verein' },
          }}
        />
      </section>

      <WorkshopsComponent
        blockType="workshops"
        variant="preview"
        tagLabel="WERKSTATT-WAND"
        tagColor="orange"
        heading="Werkzeug & Räume"
        allLink={{ label: 'alle 6 Werkstätten →', url: '/werkzeug' }}
        note="über 40 Maschinen ↴"
        hint="Maschinen nutzt du nach einer Einweisung selbstständig."
        hintCta={{ label: 'Offene Tür besuchen →', url: '/events' }}
      />

      <CtaBandComponent
        blockType="ctaBand"
        heading="Mach mit. Bau mit."
        text="Werde Mitglied, unterstütze als Fördermitglied oder spende — jede Hilfe zählt."
        primary={{ label: 'Mitglied werden →', url: '/mitmachen' }}
        secondary={{ label: 'Spenden', url: '/spenden' }}
      />
    </main>
  )
}
