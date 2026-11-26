import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { MONO_LINK, SectionHeading } from '@/components/ui'
import { archiveYearPath, archiveYears, berlinYearRange } from '@/lib/archiveYears'
import { startOfTodayBerlin } from '@/lib/eventTime'
import { findPublic } from '@/lib/publicData'
import { ListView } from './ListView'
import { toEventVM } from './model'

/** Which years have past events, newest first (one page each, S5.9). */
export async function loadArchiveYears(cutoff: Date = startOfTodayBerlin()): Promise<number[]> {
  const res = await findPublic({
    collection: 'events',
    where: { date: { less_than: cutoff.toISOString() } },
    limit: 5000,
    depth: 0,
  })
  return archiveYears(res.docs.map((e) => new Date(e.date)))
}

/**
 * One year of the events archive (S5.9, S5.16). `year` undefined = the newest
 * year, shown on /events/archiv itself. A year without past events is a 404.
 */
export async function EventsArchive({ year }: { year?: number }) {
  // Same Berlin start-of-day cutoff as "upcoming": an event is in exactly one
  // bucket, and today's events stay out of the archive until Berlin midnight.
  const cutoff = startOfTodayBerlin()
  const years = await loadArchiveYears(cutoff)
  const newest = years[0]
  const shown = year ?? newest
  if (year !== undefined && !years.includes(year)) notFound()

  const events =
    shown === undefined
      ? []
      : (
          await findPublic({
            collection: 'events',
            where: {
              and: [
                { date: { greater_than_equal: berlinYearRange(shown).start.toISOString() } },
                { date: { less_than: berlinYearRange(shown).end.toISOString() } },
                { date: { less_than: cutoff.toISOString() } },
              ],
            },
            sort: '-date', // most recent past event first
            limit: 500,
            depth: 1,
          })
        ).docs.map(toEventVM)

  const i = shown === undefined ? -1 : years.indexOf(shown)
  const newer = i > 0 ? years[i - 1] : undefined
  const older = i >= 0 && i < years.length - 1 ? years[i + 1] : undefined

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
      {shown === undefined || newest === undefined ? (
        <p className="py-16 text-center font-mono text-sm text-muted">Noch keine vergangenen Termine.</p>
      ) : (
        <>
          <YearNav years={years} current={shown} newest={newest} />
          <section aria-labelledby={`jahr-${shown}`}>
            <SectionHeading
              heading={String(shown)}
              meta={events.length === 1 ? '1 Event' : `${events.length} Events`}
              headingId={`jahr-${shown}`}
              className="mb-4"
            />
            <ListView events={events} showYear />
          </section>
          <nav aria-label="Weitere Jahre" className="mt-10 flex flex-wrap justify-between gap-4">
            {newer !== undefined ? (
              <Link href={archiveYearPath(newer, newest)} className={MONO_LINK} rel="prev">
                ← {newer}
              </Link>
            ) : (
              <span />
            )}
            {older !== undefined ? (
              <Link href={archiveYearPath(older, newest)} className={MONO_LINK} rel="next">
                {older} →
              </Link>
            ) : null}
          </nav>
        </>
      )}
    </main>
  )
}

/** One link per year: the year jump, and the "page number" of this page. */
export function YearNav({ years, current, newest }: { years: number[]; current: number; newest: number }) {
  return (
    <nav aria-label="Jahre im Archiv" className="mb-8">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {years.map((y) => (
          <li key={y}>
            {y === current ? (
              <span
                aria-current="page"
                className="inline-block rounded-[6px] bg-button px-3 py-1.5 font-mono text-[14px] font-bold text-button-text"
              >
                {y}
              </span>
            ) : (
              <Link
                href={archiveYearPath(y, newest)}
                className="inline-block rounded-[6px] border border-line px-3 py-1.5 font-mono text-[14px] text-inherit no-underline hover:border-brand"
              >
                {y}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
