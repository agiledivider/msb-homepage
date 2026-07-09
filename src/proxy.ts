import { type NextRequest, NextResponse } from 'next/server'

/**
 * Optional HTTP Basic Auth gate in front of the whole app (site + Payload admin
 * + API). Enabled only when BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are set —
 * so local dev is unaffected. Runs in the Node runtime (Next 16 `proxy`), so it
 * can read runtime env. A simple "not public yet" lock for staging deploys;
 * remove the env vars to open the site to the world.
 */
export function proxy(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASSWORD
  if (!user || !pass) return NextResponse.next() // gate disabled

  const header = req.headers.get('authorization')
  if (header?.startsWith('Basic ')) {
    const decoded = atob(header.slice(6))
    const sep = decoded.indexOf(':')
    if (sep !== -1 && decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="MakerSpace Bonn", charset="UTF-8"' },
  })
}

export const config = {
  // gate everything except Next's static assets and the favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
