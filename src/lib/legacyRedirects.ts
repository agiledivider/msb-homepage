import { legacyArticles } from '@/seed/legacy-articles'
import archivePaths from './legacy-paths.json'
import { legacyMenuPaths, legacyViews } from './legacyMenu'

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
 * Order: article id (`?view=article&id=374:slug&catid=10`), list view, menu path.
 * The static adapters in scripts/publish-static.ts emit the same order.
 */
export function resolveLegacyPath(url: URL): string | null {
  const article = resolveArticle(url)
  if (article) return article
  const isFront = url.pathname === '/' || url.pathname === '/index.php'
  if (isFront) {
    const view = legacyViews.find((v) => url.searchParams.get(v.param) === v.value)
    if (view) return view.target
  }
  const menu = /^\/index\.php(?:\/(.*?))?\/?$/.exec(url.pathname)
  if (!menu) return null
  return legacyMenuPaths[menu[1] ?? ''] ?? null
}

function resolveArticle(url: URL): string | null {
  if (url.searchParams.get('view') !== 'article') return null
  const idParam = url.searchParams.get('id')
  if (!idParam) return null
  const id = Number.parseInt(idParam, 10) // "374:slug" → 374
  if (Number.isNaN(id)) return null
  return legacyRedirects[id] ?? null
}
