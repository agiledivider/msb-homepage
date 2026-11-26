import { sql } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'
import { z } from 'zod'
import { berlinDay, type SourceKind } from '@/lib/stats/hit'

/** The period the view shows: a preset ("last N days") or a from/to pair of Berlin days. */
export type Period = { from: string; to: string; preset: number | null }

export const PRESETS = [7, 30, 90, 365] as const
const DEFAULT_PRESET = 30
const MAX_DAYS = 3 * 366

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Calendar arithmetic on `YYYY-MM-DD` (no time zone involved: these are already Berlin days). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const isRealDay = (day: string) => Day.safeParse(day).success && addDays(day, 0) === day

/**
 * Reads the period from the view's query (`?tage=30` or `?von=…&bis=…`).
 * Anything unreadable falls back to the last 30 days; a reversed pair is
 * swapped, a period longer than three years is cut to its last three years.
 */
export function parsePeriod(params: Record<string, string | string[] | undefined>, now: Date): Period {
  const one = (k: string) => {
    const v = params[k]
    return Array.isArray(v) ? v[0] : v
  }
  const today = berlinDay(now)
  const von = one('von')
  const bis = one('bis')
  if (von && bis && isRealDay(von) && isRealDay(bis)) {
    let [from, to] = von <= bis ? [von, bis] : [bis, von]
    if (to > today) to = today
    if (from > to) from = to
    if (daysBetween(from, to) > MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1))
    return { from, to, preset: null }
  }
  const n = Number(one('tage'))
  const preset = (PRESETS as readonly number[]).includes(n) ? n : DEFAULT_PRESET
  return { from: addDays(today, -(preset - 1)), to: today, preset }
}

/** Number of days from `from` to `to`, both included. */
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1

export type DayTotal = { day: string; visits: number; views: number }
export type PageTotal = { path: string; views: number; visits: number }
export type SourceTotal = { kind: SourceKind; source: string; visits: number }

export type Stats = {
  period: Period
  days: DayTotal[]
  pages: PageTotal[]
  sources: SourceTotal[]
  /** First day anything was counted, or null if nothing has been yet. */
  since: string | null
}

type Reader = { all: <T>(query: ReturnType<typeof sql>) => Promise<T[]> }
const drizzle = (payload: Payload) => (payload.db as unknown as { drizzle: Reader }).drizzle

const num = (v: unknown) => Number(v ?? 0)

/** All totals for the period: one entry per day (zeros included), pages and sources by count. */
export async function loadStats(payload: Payload, period: Period): Promise<Stats> {
  const db = drizzle(payload)
  const { from, to } = period

  const dayRows = await db.all<{ day: string; views: unknown; visits: unknown }>(
    sql`SELECT day, sum(views) AS views, sum(visits) AS visits FROM stat_pages
        WHERE day BETWEEN ${from} AND ${to} GROUP BY day`,
  )
  const byDay = new Map(dayRows.map((r) => [r.day, r]))
  const days: DayTotal[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = byDay.get(d)
    days.push({ day: d, views: num(r?.views), visits: num(r?.visits) })
  }

  const pages = (
    await db.all<{ path: string; views: unknown; visits: unknown }>(
      sql`SELECT path, sum(views) AS views, sum(visits) AS visits FROM stat_pages
          WHERE day BETWEEN ${from} AND ${to} GROUP BY path ORDER BY views DESC, path LIMIT 500`,
    )
  ).map((r) => ({ path: r.path, views: num(r.views), visits: num(r.visits) }))

  const sources = (
    await db.all<{ kind: SourceKind; source: string; visits: unknown }>(
      sql`SELECT kind, source, sum(visits) AS visits FROM stat_sources
          WHERE day BETWEEN ${from} AND ${to} GROUP BY kind, source ORDER BY visits DESC, source`,
    )
  ).map((r) => ({ kind: r.kind, source: r.source, visits: num(r.visits) }))

  const first = await db.all<{ day: string | null }>(sql`SELECT min(day) AS day FROM stat_pages`)

  return { period, days, pages, sources, since: first[0]?.day ?? null }
}

/** What kind of page a path is, for the three "most read" lists. */
export type PageKind = 'post' | 'event' | 'page'
export function pageKind(path: string): PageKind {
  if (/^\/blog\/(?!seite(\/|$))[^/]+$/.test(path)) return 'post'
  if (/^\/events\/(?!archiv(\/|$)|calendar\.ics$)[^/]+$/.test(path)) return 'event'
  return 'page'
}

const FIXED_TITLES: Record<string, string> = {
  '/': 'Startseite',
  '/blog': 'Blog',
  '/events': 'Termine',
  '/events/archiv': 'Termin-Archiv',
  '/suche': 'Suche',
}

/** A readable name for each path: the document's title where one exists, else a fixed name, else the path. */
export async function titlesFor(payload: Payload, paths: string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  const slugs: Record<'blog' | 'events' | 'pages' | 'workshops', string[]> = {
    blog: [],
    events: [],
    pages: [],
    workshops: [],
  }
  for (const path of paths) {
    const fixed = FIXED_TITLES[path]
    if (fixed) titles.set(path, fixed)
    else if (/^\/blog\/seite\/\d+$/.test(path)) titles.set(path, `Blog, Seite ${path.split('/').at(-1)}`)
    else if (/^\/events\/archiv\/\d{4}$/.test(path)) titles.set(path, `Termin-Archiv ${path.split('/').at(-1)}`)
    else {
      const m = /^\/(?:(blog|events|werkzeug)\/)?([^/]+)$/.exec(path)
      if (!m?.[2]) continue
      const coll = m[1] === 'blog' ? 'blog' : m[1] === 'events' ? 'events' : m[1] === 'werkzeug' ? 'workshops' : 'pages'
      slugs[coll].push(m[2])
    }
  }
  const prefix = { blog: '/blog/', events: '/events/', pages: '/', workshops: '/werkzeug/' } as const
  for (const coll of Object.keys(slugs) as (keyof typeof slugs)[]) {
    if (slugs[coll].length === 0) continue
    const found = await payload.find({
      collection: coll,
      where: { slug: { in: slugs[coll] } },
      limit: slugs[coll].length,
      depth: 0,
      pagination: false,
      select: { title: true, slug: true },
    })
    for (const doc of found.docs as { title?: string | null; slug?: string | null }[]) {
      if (doc.slug && doc.title) titles.set(`${prefix[coll]}${doc.slug}`, doc.title)
    }
  }
  return titles
}
