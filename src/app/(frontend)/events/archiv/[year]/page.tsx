import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { EventsArchive, loadArchiveYears } from '@/components/events/EventsArchive'
import { ARCHIVE_PATH, parseArchiveYear } from '@/lib/archiveYears'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ year: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = parseArchiveYear((await params).year)
  if (!year) return {}
  return {
    title: `Event-Archiv ${year}`,
    description: `Workshops, offene Türen, Treffs und Gast-Veranstaltungen im MakerSpace Bonn im Jahr ${year}.`,
    alternates: { canonical: `${ARCHIVE_PATH}/${year}` },
  }
}

/** One older year of the events archive (S5.9). The newest year is /events/archiv. */
export default async function EventsArchiveYearPage({ params }: Props) {
  const year = parseArchiveYear((await params).year)
  if (!year) notFound()
  const [newest] = await loadArchiveYears()
  if (year === newest) permanentRedirect(ARCHIVE_PATH)
  return <EventsArchive year={year} />
}
