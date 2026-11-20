'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN = '/admin'

/**
 * Top of the admin sidebar (`admin.components.beforeNavLinks`): MSB signet and
 * name, plus a "Start" link to the dashboard, which Payload's nav doesn't have.
 * The link reuses Payload's `nav__link` markup so custom.scss styles it like the
 * others; `#nav-start` gets its icon there.
 */
export function NavBrand() {
  const pathname = usePathname()
  const onStart = pathname === ADMIN || pathname === `${ADMIN}/`

  return (
    <div className="msb-nav-brand">
      <Link href={ADMIN} className="msb-nav-brand__home">
        {/* biome-ignore lint/performance/noImgElement: tiny static SVG in the admin, no optimisation needed */}
        <img src="/logo/signet-green.svg" alt="" width={32} height={36} />
        <span>
          <strong>MakerSpace Bonn</strong>
          <small>Redaktion</small>
        </span>
      </Link>
      <Link href={ADMIN} id="nav-start" className="nav__link" aria-current={onStart ? 'page' : undefined}>
        {onStart ? <div className="nav__link-indicator" /> : null}
        <span className="nav__link-label">Start</span>
      </Link>
    </div>
  )
}
