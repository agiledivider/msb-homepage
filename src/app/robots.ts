import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic' // origin comes from the runtime env, not the build

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/next', '/preview'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
