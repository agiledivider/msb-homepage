import type { Metadata } from 'next'
import Link from 'next/link'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'
import { SearchField } from '@/components/search/SearchField'
import { SearchHitRow } from '@/components/search/SearchHitRow'
import { BTN_PRIMARY, MONO_LINK } from '@/components/ui'
import { findPublic } from '@/lib/publicData'
import { parseSearchFilter, SEARCH_FILTERS, type SearchFilter, search } from '@/lib/search'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ q?: string | string[]; typ?: string | string[] }> }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = one((await searchParams).q).trim()
  return {
    title: q ? `Suche: ${q}` : 'Suche',
    // Every query is its own address, but result lists don't belong in search engines.
    robots: { index: false, follow: true },
  }
}

const TAB_LABEL: Record<SearchFilter, string> = {
  alle: 'Alles',
  events: 'Events',
  blog: 'Blog',
  seiten: 'Seiten',
}

const href = (q: string, typ: SearchFilter) => `/suche?q=${encodeURIComponent(q)}${typ === 'alle' ? '' : `&typ=${typ}`}`

/** Site search results (S5.17): /suche?q=…&typ=events, shareable as a link. */
export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const q = one(params.q).slice(0, 100).trim()
  const filter = parseSearchFilter(one(params.typ))
  const result = q ? await search(q, { filter, limit: 60 }) : null
  const shown = result?.hits ?? []
  const inFilter = result ? result.counts[filter] : 0

  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent blockType="pageIntro" tag="SUCHE" headline="Was suchst du?" />

      <search className="mt-8 block max-w-[720px]">
        <form action="/suche" className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <SearchField
              id="suche-q"
              label="Suchbegriff"
              name="q"
              defaultValue={q}
              placeholder="z. B. Lasercutter oder Repair-Café"
            />
          </div>
          {filter !== 'alle' ? <input type="hidden" name="typ" value={filter} /> : null}
          <button
            type="submit"
            className={`${BTN_PRIMARY} min-h-11 shrink-0 rounded-[6px] px-[18px] font-sans text-[15px] font-bold`}
          >
            Suchen
          </button>
        </form>
      </search>

      {!q ? (
        <Suggestions intro="Tipp: Suche nach einer Maschine, einem Material oder einem Event." />
      ) : (
        <>
          {result && result.counts.alle > 0 ? (
            <nav aria-label="Treffer nach Art" className="mt-8 border-b border-line">
              <ul className="-mb-px m-0 flex list-none gap-0 overflow-x-auto p-0 md:gap-1">
                {SEARCH_FILTERS.map((f) => {
                  const n = result?.counts[f] ?? 0
                  const current = f === filter
                  return (
                    <li key={f} className="shrink-0">
                      <Link
                        href={href(q, f)}
                        aria-current={current ? 'page' : undefined}
                        className={`inline-flex min-h-11 items-center gap-1.5 border-b-[3px] px-2 font-sans md:gap-2 md:px-3 text-[15px] no-underline ${
                          current
                            ? 'border-brand-text font-bold text-brand-text'
                            : 'border-transparent text-ink hover:border-line'
                        } ${n === 0 && !current ? 'text-muted' : ''}`}
                      >
                        {TAB_LABEL[f]}
                        <span
                          className={`rounded-full px-2 font-mono text-[14px] ${current ? 'bg-green-pale' : 'bg-fond text-muted'}`}
                        >
                          {n}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          ) : null}

          {shown.length ? (
            <>
              <p className="m-0 mt-5 font-sans text-[15px] text-muted" aria-live="polite">
                {inFilter === 1 ? '1 Treffer' : `${inFilter} Treffer`} für „{q}“
                {inFilter > shown.length ? `, die besten ${shown.length} hier` : ''}
              </p>
              <ol className="m-0 mt-3 max-w-[860px] list-none divide-y divide-line p-0">
                {shown.map((hit) => (
                  <li key={hit.id}>
                    <SearchHitRow hit={hit} size="full" />
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <Suggestions
              intro={
                result && result.counts.alle > 0
                  ? `Unter „${TAB_LABEL[filter]}“ gibt es nichts zu „${q}“, unter „Alles“ schon.`
                  : `Für „${q}“ gibt es keinen Treffer. Ein kürzeres Wort oder eine andere Schreibweise findet oft mehr.`
              }
              allHref={result && result.counts.alle > 0 ? href(q, 'alle') : undefined}
            />
          )}
        </>
      )}
    </main>
  )
}

/** Where to go when there is nothing (yet): the workshops, the blog, the events. */
async function Suggestions({ intro, allHref }: { intro: string; allHref?: string }) {
  const workshops = await findPublic({ collection: 'workshops', sort: 'order', limit: 20, depth: 0 })
  return (
    <section className="mt-10 max-w-[720px] rounded-[16px] border border-line bg-card p-6 md:p-8">
      <p className="m-0 font-serif text-[18px] italic leading-[1.4] text-muted">{intro}</p>
      {allHref ? (
        <Link href={allHref} className={`${MONO_LINK} mt-2`}>
          Alle Treffer zeigen
        </Link>
      ) : null}
      <h2 className="m-0 mt-6 font-sans text-[16px] font-bold">Werkstätten</h2>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
        {workshops.docs.map((w) =>
          w.slug ? (
            <li key={w.id}>
              <Link
                href={`/werkzeug/${w.slug}`}
                className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-3.5 text-[15px] text-ink no-underline hover:border-brand-text hover:text-brand-text"
              >
                {w.title}
              </Link>
            </li>
          ) : null,
        )}
      </ul>
      <p className="m-0 mt-6 flex flex-wrap gap-x-6">
        <Link href="/events" className={MONO_LINK}>
          Kommende Events
        </Link>
        <Link href="/blog" className={MONO_LINK}>
          Alle Blogbeiträge
        </Link>
      </p>
    </section>
  )
}
