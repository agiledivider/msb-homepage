'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** "Statistik" in the admin sidebar (S5.11), Payload's `nav__link` markup like the Backups link. */
export function StatsNavLink() {
  const href = '/admin/statistik'
  const active = usePathname() === href
  return (
    <Link href={href} id="nav-statistik" className="nav__link" aria-current={active ? 'page' : undefined}>
      {active ? <div className="nav__link-indicator" /> : null}
      <span className="nav__link-label">Statistik</span>
    </Link>
  )
}
