import type { Metadata } from 'next'
import { EventsArchive } from '@/components/events/EventsArchive'
import { ARCHIVE_PATH } from '@/lib/archiveYears'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Event-Archiv — vergangene Termine',
  description: 'Rückblick auf vergangene Workshops, offene Türen, Treffs und Gast-Veranstaltungen im MakerSpace Bonn.',
  alternates: { canonical: ARCHIVE_PATH },
}

/** The newest year of the events archive; older years on /events/archiv/<year> (S5.9). */
export default function EventsArchivePage() {
  return <EventsArchive />
}
