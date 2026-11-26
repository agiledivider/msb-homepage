import type { MetadataRoute } from 'next'
import { loadArchiveYears } from '@/components/events/EventsArchive'
import { archiveYearPath } from '@/lib/archiveYears'
import { findPublic, type PublicCollection } from '@/lib/publicData'
import { pagePath, siteUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic' // a newly published page shows up without a rebuild

/** Fixed routes that aren't documents. */
const STATIC_ROUTES = ['/', '/blog', '/events', '/events/archiv']

const DETAIL_BASE: Record<Exclude<PublicCollection, 'pages'>, string> = {
  blog: '/blog',
  events: '/events',
  workshops: '/werkzeug',
}

/** Every live (published + approved) page, post, event and workshop. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const live = (collection: PublicCollection) => findPublic({ collection, limit: 5000, depth: 0 })

  const [pages, ...details] = await Promise.all([
    live('pages'),
    ...(Object.keys(DETAIL_BASE) as Array<keyof typeof DETAIL_BASE>).map(async (c) => ({
      prefix: DETAIL_BASE[c],
      res: await live(c),
    })),
  ])

  const entries = new Map<string, Date | undefined>(STATIC_ROUTES.map((r) => [r, undefined]))
  for (const p of pages.docs) if (p.slug) entries.set(pagePath(p.slug), new Date(p.updatedAt))
  for (const { prefix, res } of details) {
    for (const d of res.docs) if (d.slug) entries.set(`${prefix}/${d.slug}`, new Date(d.updatedAt))
  }

  // Older years of the events archive, one page each (S5.9); the newest is /events/archiv.
  const years = await loadArchiveYears()
  for (const y of years.slice(1)) entries.set(archiveYearPath(y, years[0]), undefined)

  return [...entries].map(([path, lastModified]) => ({ url: `${base}${path}`, lastModified }))
}
