'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** The link itself: Payload's `nav__link` markup, marked active on the backups page like the other entries. */
export function BackupsNavLinkClient({ href }: { href: string }) {
  const active = usePathname() === href
  return (
    <Link href={href} id="nav-backups" className="nav__link" aria-current={active ? 'page' : undefined}>
      {active ? <div className="nav__link-indicator" /> : null}
      <span className="nav__link-label">Backups</span>
    </Link>
  )
}
