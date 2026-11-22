import { legacyArticles } from '@/seed/legacy-articles'
import archivePaths from './legacy-paths.json'

/**
 * Old Joomla article id → new canonical path. Used by the proxy to 301-redirect
 * the old /?view=article&id=<id>:… URLs, preserving SEO. Two sources:
 *  - the hand-migrated articles (legacy-articles.ts), derived here;
 *  - legacy-paths.json, generated with the archive import: every archived
 *    article, plus the old pages that were not imported (opening-hours notices
 *    → /blog, old static pages → their new page). Kept small on purpose so the
 *    proxy doesn't load the article bodies; tests/unit/legacy-archive.test.ts
 *    checks it against the archive.
 */
export const legacyRedirects: Record<number, string> = {
  ...Object.fromEntries(Object.entries(archivePaths).map(([id, path]) => [Number(id), path])),
  ...Object.fromEntries(legacyArticles.map((a) => [a.legacyId, `/${a.kind === 'blog' ? 'blog' : 'events'}/${a.slug}`])),
}

/**
 * Resolve a legacy Joomla request to its new path, or null if it isn't one.
 * Handles `?view=article&id=374:slug&catid=10` and `?view=article&id=374`.
 */
export function resolveLegacyPath(url: URL): string | null {
  if (url.searchParams.get('view') !== 'article') return null
  const idParam = url.searchParams.get('id')
  if (!idParam) return null
  const id = Number.parseInt(idParam, 10) // "374:slug" → 374
  if (Number.isNaN(id)) return null
  return legacyRedirects[id] ?? null
}
