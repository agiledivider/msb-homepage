/**
 * Site search (S5.17) over everything a visitor can read: pages, workshops,
 * blog posts and events, upcoming and past. Reads only through `findPublic`
 * (published + approved), so a draft can never be found. ~300 documents: the
 * index lives in memory and is rebuilt at most once a minute.
 */
import { isToolIcon, type ToolIconName } from '@/blocks/Workshops/icons'
import { startOfTodayBerlin } from '@/lib/eventTime'
import { findPublic } from '@/lib/publicData'
import { pagePath } from '@/lib/seo'
import { highlight, MIN_INFIX, normalize, plainText, queryTerms, type Segment, snippet } from './text'

export type SearchKind = 'event' | 'blog' | 'workshop' | 'page'

/** Filter tabs on the results page; pages and workshops share one. */
export const SEARCH_FILTERS = ['alle', 'events', 'blog', 'seiten'] as const
export type SearchFilter = (typeof SEARCH_FILTERS)[number]
const FILTER_KINDS: Record<SearchFilter, SearchKind[]> = {
  alle: ['event', 'blog', 'workshop', 'page'],
  events: ['event'],
  blog: ['blog'],
  seiten: ['page', 'workshop'],
}
export const parseSearchFilter = (v: unknown): SearchFilter =>
  (SEARCH_FILTERS as readonly unknown[]).includes(v) ? (v as SearchFilter) : 'alle'

export type SearchImage = { url: string; alt: string } | null

/** One result, ready to draw: highlighted title and snippet, type-specific meta. */
export type SearchHit = {
  kind: SearchKind
  id: string
  href: string
  title: Segment[]
  snippet: Segment[]
  /** events: start; blog: published */
  date: string | null
  /** events only: already over (Berlin day) */
  past: boolean
  author: string | null
  image: SearchImage
  icon: ToolIconName | null
}

type Entry = {
  kind: SearchKind
  id: string
  href: string
  title: string
  /** subtitle, description, excerpt: weighted above the body */
  lead: string
  body: string
  nTitle: string
  nLead: string
  nBody: string
  date: string | null
  author: string | null
  image: SearchImage
  icon: ToolIconName | null
}

const asImage = (v: unknown): SearchImage => {
  if (!v || typeof v !== 'object') return null
  const m = v as { url?: string | null; alt?: string | null }
  return m.url ? { url: m.url, alt: m.alt ?? '' } : null
}

function entry(e: Omit<Entry, 'nTitle' | 'nLead' | 'nBody'>): Entry {
  return { ...e, nTitle: normalize(e.title), nLead: normalize(e.lead), nBody: normalize(e.body) }
}

const join = (...parts: Array<string | null | undefined | string[]>) =>
  parts
    .flat()
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .join(' ')

async function buildIndex(): Promise<Entry[]> {
  const all = { limit: 5000, depth: 1 } as const
  const [pages, workshops, blog, events] = await Promise.all([
    findPublic({ collection: 'pages', ...all }),
    findPublic({ collection: 'workshops', ...all }),
    findPublic({ collection: 'blog', ...all }),
    findPublic({ collection: 'events', ...all }),
  ])
  const out: Entry[] = []
  for (const p of pages.docs) {
    if (!p.slug) continue
    out.push(
      entry({
        kind: 'page',
        id: `page-${p.id}`,
        href: pagePath(p.slug),
        title: p.title,
        lead: '',
        body: join(plainText(p.layout)),
        date: null,
        author: null,
        image: null,
        icon: null,
      }),
    )
  }
  for (const w of workshops.docs) {
    if (!w.slug) continue
    const { title, verbs, summary, promise, ...rest } = w
    out.push(
      entry({
        kind: 'workshop',
        id: `workshop-${w.id}`,
        href: `/werkzeug/${w.slug}`,
        title,
        lead: join(verbs, summary, promise),
        body: join(plainText(rest)),
        date: null,
        author: null,
        image: null,
        icon: isToolIcon(w.icon) ? w.icon : null,
      }),
    )
  }
  for (const b of blog.docs) {
    if (!b.slug) continue
    out.push(
      entry({
        kind: 'blog',
        id: `blog-${b.id}`,
        href: `/blog/${b.slug}`,
        title: b.title,
        lead: join(b.subtitle, b.excerpt),
        body: join(plainText(b.body)),
        date: b.publishedAt ?? null,
        author: b.author ?? null,
        image: asImage(b.cover),
        icon: null,
      }),
    )
  }
  for (const e of events.docs) {
    if (!e.slug) continue
    out.push(
      entry({
        kind: 'event',
        id: `event-${e.id}`,
        href: `/events/${e.slug}`,
        title: e.title,
        lead: join(e.subtitle, e.description, e.category, e.location),
        body: join(plainText(e.body)),
        date: e.date,
        author: null,
        image: asImage(e.image),
        icon: null,
      }),
    )
  }
  return out
}

const TTL_MS = 60_000
let cache: { at: number; entries: Promise<Entry[]> } | null = null

/** The index, rebuilt when older than a minute (a newly published post shows up soon). */
function index(now: number): Promise<Entry[]> {
  if (!cache || now - cache.at > TTL_MS) {
    const entries = buildIndex()
    cache = { at: now, entries }
    entries.catch(() => {
      cache = null // a failed build is retried on the next search
    })
  }
  return cache.entries
}

/**
 * How a term sits in a text: 3 a whole word ("laser" in "Laser & CNC"),
 * 2 the start of a word ("laser" in "Lasercutter"), 1 inside a word
 * ("cutter" in "Lasercutter", German compounds), 0 not at all. Inside a word
 * only counts from 4 letters, so "art" doesn't find "Start" or "Karte".
 */
export function matchKind(haystack: string, term: string): 0 | 1 | 2 | 3 {
  if (!haystack.includes(term)) return 0
  if (new RegExp(`(^|[^a-z0-9])${term}($|[^a-z0-9])`).test(haystack)) return 3
  if (new RegExp(`(^|[^a-z0-9])${term}`).test(haystack)) return 2
  return term.length >= MIN_INFIX ? 1 : 0
}

// Points per term by where it is and how it matches: [inside, start, whole word].
const POINTS = { title: [6, 12, 14], lead: [3, 5, 6], body: [1, 2, 2] } as const

/**
 * Score of an entry for the terms; 0 = not every term found (all words must
 * match). Title over lead (subtitle, description, excerpt) over body; a whole
 * word over a word start over a match inside a word; the words next to each
 * other in order ("3d druck" in "3D-Druck") on top.
 */
export function score(
  e: Pick<Entry, 'kind' | 'nTitle' | 'nLead' | 'nBody' | 'date'>,
  terms: string[],
  today: Date,
): number {
  let total = 0
  let upfront = false // a term in the title or lead, not only somewhere in the text
  for (const t of terms) {
    const title = matchKind(e.nTitle, t)
    const lead = matchKind(e.nLead, t)
    const body = matchKind(e.nBody, t)
    if (!title && !lead && !body) return 0
    if (title || lead) upfront = true
    if (title) total += POINTS.title[title - 1]
    if (lead) total += POINTS.lead[lead - 1]
    // A term the text keeps coming back to counts a little more, up to +2.
    if (body) total += POINTS.body[body - 1] + Math.min(2, e.nBody.split(t).length - 2)
  }
  if (terms.length > 1) {
    const phrase = new RegExp(terms.join('[^a-z0-9]*'))
    if (phrase.test(e.nTitle)) total += 10
    else if (phrase.test(e.nLead) || phrase.test(e.nBody)) total += 3
  }
  // Where to go (a workshop, a page) and what's still ahead outrank the archive.
  if ((e.kind === 'workshop' || e.kind === 'page') && upfront) total += 3
  if (e.kind === 'event' && e.date) total += new Date(e.date) >= today ? 4 : 0
  return total
}

/** Newer first among equal scores (events and posts carry a date). */
const byScoreThenDate = (a: { s: number; e: Entry }, b: { s: number; e: Entry }) =>
  b.s - a.s || (b.e.date ?? '').localeCompare(a.e.date ?? '')

export type SearchResult = {
  query: string
  /** hits for the chosen filter, best first, at most `limit` */
  hits: SearchHit[]
  /** all hits per filter, for the tab counts */
  counts: Record<SearchFilter, number>
}

/** Run a search. `now` is injectable for tests and for the past/upcoming split. */
export async function search(
  query: string,
  {
    filter = 'alle',
    limit = 50,
    now = new Date(),
    compact = false,
  }: {
    filter?: SearchFilter
    limit?: number
    now?: Date
    /** quick results: a short snippet that starts close to the match, so one line shows it */
    compact?: boolean
  } = {},
): Promise<SearchResult> {
  const terms = queryTerms(query)
  const counts: Record<SearchFilter, number> = { alle: 0, events: 0, blog: 0, seiten: 0 }
  if (!terms.length) return { query, hits: [], counts }
  const today = startOfTodayBerlin(now)
  const ranked = (await index(now.getTime()))
    .map((e) => ({ e, s: score(e, terms, today) }))
    .filter((r) => r.s > 0)
    .sort(byScoreThenDate)
  for (const { e } of ranked) {
    counts.alle++
    for (const f of SEARCH_FILTERS) if (f !== 'alle' && FILTER_KINDS[f].includes(e.kind)) counts[f]++
  }
  const kinds = FILTER_KINDS[filter]
  const hits = ranked
    .filter((r) => kinds.includes(r.e.kind))
    .slice(0, limit)
    .map(({ e }): SearchHit => {
      // The snippet comes from the lead when it has a hit, else from the body.
      const leadHit = terms.some((t) => e.nLead.includes(t))
      const source = leadHit || !e.body ? e.lead || e.body : e.body
      return {
        kind: e.kind,
        id: e.id,
        href: e.href,
        title: highlight(e.title, terms),
        snippet: compact ? snippet(source, terms, 110, 18) : snippet(source, terms),
        date: e.date,
        past: e.kind === 'event' && !!e.date && new Date(e.date) < today,
        author: e.author,
        image: e.image,
        icon: e.icon,
      }
    })
  return { query, hits, counts }
}

/** Forget the cached index (tests). */
export const resetSearchIndex = () => {
  cache = null
}
