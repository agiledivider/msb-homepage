import type { Page } from '@/payload-types'

/**
 * Public origin for absolute URLs (sitemap, robots). Same source as the
 * layout's metadataBase and the static publisher's SITE_URL.
 */
export const siteUrl = (): string => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

/** Search engines cut descriptions at roughly this length. */
const MAX_DESCRIPTION = 160

/**
 * A content page's description: the lede of its first PageIntro block, which
 * every Verein / Werkzeug / Mitmachen / legal page opens with. Undefined when
 * there is none, so the layout's site-wide description applies.
 */
export function pageDescription(layout: Page['layout']): string | undefined {
  const intro = layout?.find((b) => b.blockType === 'pageIntro')
  const lede = intro && 'lede' in intro ? intro.lede?.replace(/\s+/g, ' ').trim() : undefined
  if (!lede) return undefined
  return lede.length <= MAX_DESCRIPTION ? lede : `${lede.slice(0, MAX_DESCRIPTION - 1).replace(/\s+\S*$/, '')}…`
}

/** Public path of a content page; the `home` page is the start page. */
export const pagePath = (slug: string): string => (slug === 'home' ? '/' : `/${slug}`)
