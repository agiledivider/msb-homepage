import { type NextRequest, NextResponse } from 'next/server'
import { resolveLegacyPath } from '@/lib/legacyRedirects'

/**
 * Edge/Node proxy: (1) 301-redirects the old Joomla article URLs to the new
 * /blog|events paths for SEO continuity, then (2) an optional HTTP Basic Auth
 * gate in front of the whole app (site + Payload admin + API). Auth is enabled
 * only when BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are set — so local dev is
 * unaffected. Runs in the Node runtime (Next 16 `proxy`), so it can read runtime
 * env. Remove the auth env vars to open the site to the world.
 */
export function proxy(req: NextRequest) {
  // 1) Legacy Joomla article URL → new canonical path (301). Runs before the
  //    auth gate so old inbound links/crawlers always resolve.
  const legacy = resolveLegacyPath(req.nextUrl)
  if (legacy) {
    const url = req.nextUrl.clone()
    url.pathname = legacy
    url.search = ''
    return NextResponse.redirect(url, 301)
  }

  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASSWORD
  if (!user || !pass) return NextResponse.next() // gate disabled

  const header = req.headers.get('authorization')
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6)) // throws on malformed base64 → fall through to 401
      const sep = decoded.indexOf(':')
      if (sep !== -1 && decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass) {
        return NextResponse.next()
      }
    } catch {
      // malformed credentials → treat as unauthenticated (challenge below)
    }
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="MakerSpace Bonn", charset="UTF-8"' },
  })
}

export const config = {
  // Gate everything except Next's static assets, the favicon, and the public
  // media files. `/api/media` must stay ungated: the next/image optimizer fetches
  // the source image server-side WITHOUT the Basic-Auth header, so gating it makes
  // the optimizer receive a 401 and return 400 (broken images). Media read is
  // public by design (Payload access.read), so this exposes nothing new.
  matcher: ['/((?!_next/static|_next/image|api/media|favicon.ico).*)'],
}
