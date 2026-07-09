import type { Where } from 'payload'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { CalendarView } from '@/components/events/CalendarView'
import { InfiniteEvents } from '@/components/events/InfiniteEvents'
import { PER_PAGE, toEventVM } from '@/components/events/model'
import { ViewSwitcher } from '@/components/events/ViewSwitcher'
import { getPayloadClient } from '@/lib/getPayload'

export const dynamic = 'force-dynamic'

const VIEWS = ['list', 'tiles', 'calendar'] as const
type ViewKey = (typeof VIEWS)[number]

type SearchParams = Record<string, string | string[] | undefined>
const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const view = (VIEWS as readonly string[]).includes(pick(sp.view) ?? '') ? (pick(sp.view) as ViewKey) : 'list'

  const payload = await getPayloadClient()
  const now = new Date()

  let body: React.ReactNode

  if (view === 'calendar') {
    // Show the requested month (default: current), all events within it.
    const monthParam = pick(sp.month)
    const valid = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    const [y, m] = valid ? monthParam.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1]
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 1)

    const where: Where = {
      and: [
        { _status: { equals: 'published' } },
        { date: { greater_than_equal: monthStart.toISOString() } },
        { date: { less_than: monthEnd.toISOString() } },
      ],
    }
    const res = await payload.find({ collection: 'events', where, sort: 'date', limit: 200, depth: 1 })
    body = <CalendarView month={monthStart} events={res.docs.map(toEventVM)} today={now} />
  } else {
    // List & tiles: all upcoming events. SSR the first page, then the client
    // appends further pages (auto on scroll + "Mehr laden" button).
    const sinceIso = now.toISOString()
    const where: Where = {
      and: [{ _status: { equals: 'published' } }, { date: { greater_than_equal: sinceIso } }],
    }
    const res = await payload.find({ collection: 'events', where, sort: 'date', limit: PER_PAGE, page: 1, depth: 1 })
    const events = res.docs.map(toEventVM)

    body = events.length ? (
      <InfiniteEvents
        view={view}
        initial={events}
        sinceIso={sinceIso}
        initialPage={1}
        initialHasMore={Boolean(res.hasNextPage)}
      />
    ) : (
      <p className="py-16 text-center font-mono text-sm text-muted">Aktuell keine kommenden Termine.</p>
    )
  }

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent
        blockType="pageIntro"
        tag="TERMINE"
        meta="Workshops · offene Türen · Treffs"
        headline="Events & Workshops"
        lede="Come by, learn something, meet the community."
      />
      <div className="mb-8 mt-6">
        <ViewSwitcher current={view} />
      </div>
      {body}
    </main>
  )
}
