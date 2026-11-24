'use client'

import { useNav } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isActive, type RailGroup } from './railEntries'

/**
 * The icon strip shown while the admin sidebar is closed (S9.1), from
 * src/components/admin/Nav.tsx. Desktop only: on phones the sidebar is an
 * overlay and custom.scss hides the rail. The name appears on hover/focus.
 */
export function NavRail({ groups }: { groups: RailGroup[] }) {
  const { hydrated, navOpen } = useNav()
  const pathname = usePathname()
  if (!hydrated || navOpen) return null

  return (
    <nav className="msb-rail" aria-label="Navigation">
      {groups.map((group) => (
        <ul key={group.label} className="msb-rail__group" aria-label={group.label}>
          {group.entries.map((entry) => {
            const active = isActive(pathname, entry)
            return (
              <li key={entry.id}>
                <Link
                  href={entry.href}
                  prefetch={false}
                  className="msb-rail__link"
                  data-nav-icon={entry.id}
                  aria-label={entry.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="msb-rail__tip" aria-hidden="true">
                    {entry.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ))}
    </nav>
  )
}
