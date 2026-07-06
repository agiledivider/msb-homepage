import { getPayloadClient } from '@/lib/getPayload'
import { HeroComponent, type Face } from '@/blocks/Hero/Component'
import { EventFeedComponent } from '@/blocks/EventFeed/Component'
import { WorkshopsComponent } from '@/blocks/Workshops/Component'
import { CtaBandComponent } from '@/blocks/CtaBand/Component'
import {
  heroToFace,
  blogToFace,
  eventToFace,
  fallbackBlogFace,
  fallbackEventFace,
  eventsToFeed,
} from '@/lib/mappers'

export const dynamic = 'force-dynamic' // always reflect the latest content

export default async function StartPage() {
  const payload = await getPayloadClient()
  const now = new Date().toISOString()

  const [hero, blogRes, upcomingRes, feedRes] = await Promise.all([
    payload.findGlobal({ slug: 'heroSettings', depth: 2 }),
    payload.find({
      collection: 'blog',
      where: { _status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: 1,
      depth: 2,
    }),
    payload.find({
      collection: 'events',
      where: { and: [{ _status: { equals: 'published' } }, { date: { greater_than_equal: now } }] },
      sort: 'date',
      limit: 1,
      depth: 2,
    }),
    payload.find({
      collection: 'events',
      where: { and: [{ _status: { equals: 'published' } }, { date: { greater_than_equal: now } }] },
      sort: 'date',
      limit: 5,
      depth: 2,
    }),
  ])

  // fallback: if nothing upcoming, use the most recent past event
  let nextEvent = upcomingRes.docs[0]
  if (!nextEvent) {
    const past = await payload.find({
      collection: 'events',
      where: { _status: { equals: 'published' } },
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

  const feedEvents = eventsToFeed(feedRes.docs)

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <HeroComponent faces={faces} />

      <EventFeedComponent
        blockType="eventFeed"
        tagLabel="PINNWAND"
        heading="Was läuft"
        allLink={{ label: 'alle Events →', url: '/events' }}
        events={feedEvents}
        sidebar={{
          hoursTitle: 'Öffnungszeiten',
          hoursBadge: 'DIESE WOCHE',
          hours: [
            { day: 'Do 02.', note: 'Offen', time: '18–21' },
            { day: 'Sa 05.', note: 'Handarbeit', time: '10–14' },
            { day: 'Mo 06.', note: 'Offene Tür', time: 'ab 10', highlight: true },
            { day: 'Di 07.', note: 'Offen', time: '18–21' },
            { day: 'Mi 08.', note: 'Offen', time: '18:30–21' },
          ],
          hoursFootnote: '„Offen" = für Mitglieder. Die Offene Tür ist für alle & kostenlos.',
          infoEyebrow: 'NEU HIER?',
          infoText:
            'Komm einfach zur Offenen Tür — unverbindliche Führung durch alle Werkstätten inklusive.',
          infoLink: { label: 'Mehr über uns →', url: '/verein' },
        }}
      />

      <WorkshopsComponent
        blockType="workshops"
        variant="preview"
        tagLabel="WERKSTATT-WAND"
        tagColor="orange"
        heading="Werkzeug & Räume"
        allLink={{ label: 'alle 6 Werkstätten →', url: '/werkzeug' }}
        note="über 40 Maschinen ↴"
        items={[
          { code: 'A1', title: 'Elektronik & Löten', desc: 'Lötstationen · Oszilloskope · Reflowofen' },
          { code: 'A2', title: 'Metallwerkstatt', desc: 'Schweißgerät · Drehmaschine · Bandsäge' },
          { code: 'A3', title: 'Holzwerkstatt', desc: 'Formatkreissäge · Absauganlage' },
          { code: 'A4', title: 'Textil & Handarbeit', desc: 'Nähmaschinen · Stickmaschine · Folienplotter' },
          { code: 'A5', title: '3D-Druck & CNC', desc: '3D-Drucker · Yeti Smartbench CNC-Fräse' },
          { code: 'A6', title: 'CAD & Digital', desc: 'FreeCAD · Fusion 360 · EstlCAM' },
        ]}
      />

      <CtaBandComponent
        blockType="ctaBand"
        heading="Mach mit. Bau mit."
        text="Werde Mitglied, unterstütze als Fördermitglied oder spende — jede Hilfe zählt."
        primary={{ label: 'Mitglied werden →', url: '/mitmachen' }}
        secondary={{ label: 'Spenden', url: '/mitmachen' }}
      />
    </main>
  )
}
