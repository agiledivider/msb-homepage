import { type NextRequest, NextResponse } from 'next/server'
import { resolveLegacyPath } from '@/lib/legacyRedirects'

/**
 * Node-runtime proxy (Next 16 `proxy`): 301-redirects the old Joomla article
 * URLs to their new /blog|/events paths for SEO continuity.
 *
 * The statically published site has no server to run this, so
 * `scripts/publish-static.ts` re-emits the same redirects as nginx and Apache
 * rules — sourced from the live DB rather than duplicated by hand. This copy
 * still applies to the Payload instance itself (admin, live preview, and any
 * serverful deployment).
 */
export function proxy(req: NextRequest) {
  const legacy = resolveLegacyPath(req.nextUrl)
  if (legacy) {
    const url = req.nextUrl.clone()
    url.pathname = legacy
    url.search = ''
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  // Next's own assets, the favicon and public media are never legacy article URLs.
  matcher: ['/((?!_next/static|_next/image|api/media|favicon.ico).*)'],
}
