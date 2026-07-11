import { legacyArticles } from '@/seed/legacy-articles'

/**
 * Old Joomla article id → new canonical path. Derived from the migrated
 * articles so the map is always in sync with what was seeded. Used by the proxy
 * to 301-redirect the old /?view=article&id=<id>:… URLs, preserving SEO.
 */
export const legacyRedirects: Record<number, string> = Object.fromEntries(
  legacyArticles.map((a) => [a.legacyId, `/${a.kind === 'blog' ? 'blog' : 'events'}/${a.slug}`]),
)

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
