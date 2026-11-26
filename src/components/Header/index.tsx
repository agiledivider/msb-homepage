'use client'

import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SearchDialog, useSearchShortcut } from '../search/SearchDialog'
import { ThemeToggle } from '../ThemeToggle'
import { BTN_PRIMARY } from '../ui'

export type NavItem = { label: string; href: string }

const DEFAULT_NAV: NavItem[] = [
  // No "Start": the logo links home (decided 2026-11-22).
  { label: 'Verein', href: '/verein' },
  { label: 'Werkzeug & Räume', href: '/werkzeug' },
  { label: 'Events', href: '/events' },
  { label: 'Blog', href: '/blog' },
  { label: 'Mitmachen', href: '/mitmachen' },
]

/* Nav states (styleguide "Zustände"). Mobile rows: hover Fond, current Grüner
   Fond + bold. Desktop: no underline at rest, 2px underline on hover, current
   page green with a fixed 3px underline. Every item is a 44px target. */
const NAV_LINK =
  'border-b border-line px-[22px] py-3.5 text-[16px] no-underline -outline-offset-4 md:outline-offset-2 decoration-brand-text decoration-2 underline-offset-[6px] transition-colors hover:bg-fond md:inline-flex md:min-h-11 md:items-center md:whitespace-nowrap md:border-0 md:p-0 md:text-[15px] md:hover:bg-transparent md:hover:text-brand-text md:hover:underline'
const NAV_CURRENT =
  'bg-green-pale font-bold text-brand-text md:bg-transparent md:font-medium md:underline md:decoration-[3px]'

export function Header({
  logoSrc = '/logo/logo-horizontal-no-claim.png',
  logoDarkSrc = '/logo/logo-horizontal-no-claim-negativ.png',
  nav = DEFAULT_NAV,
  cta = { label: 'Mitglied werden', href: '/mitmachen' },
  search = true,
}: {
  logoSrc?: string
  /** Negativ variant for dark mode (styleguide logo swap) */
  logoDarkSrc?: string
  nav?: NavItem[]
  cta?: NavItem
  /** Site search (S5.17). Off in the static snapshot, which has no server to search. */
  search?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const openSearch = useCallback(() => {
    if (!search) return
    setOpen(false)
    setSearching(true)
  }, [search])
  useSearchShortcut(openSearch)
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href))

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card">
      <div className="relative mx-auto flex max-w-shell items-center justify-between gap-2 px-4 py-4 md:gap-4 md:px-8 md:py-3.5 lg:gap-6">
        <Link href="/" className="flex items-center no-underline">
          {/* biome-ignore lint/performance/noImgElement: static logo PNG sized by CSS height; next/image needs fixed dimensions and adds nothing here */}
          <img src={logoSrc} alt="MakerSpace Bonn" className="block h-9 w-auto dark:hidden" />
          {/* biome-ignore lint/performance/noImgElement: same as the light logo above */}
          <img src={logoDarkSrc} alt="MakerSpace Bonn" className="hidden h-9 w-auto dark:block" />
        </Link>

        <nav
          className={`${
            open ? 'flex' : 'hidden'
          } absolute inset-x-0 top-full flex-col items-stretch border-b border-line border-t border-t-line bg-card py-1.5 shadow-[0_18px_34px_-18px_rgba(60,52,30,.55)] md:static md:flex md:flex-row md:items-center md:gap-4 md:border-0 lg:gap-7 md:bg-transparent md:py-0 md:shadow-none`}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`${NAV_LINK} ${isActive(item.href) ? NAV_CURRENT : 'font-medium text-ink'}`}
            >
              {item.label}
            </Link>
          ))}
          {search ? (
            <button
              type="button"
              onClick={openSearch}
              className="flex items-center gap-3 border-b border-line px-[22px] py-3.5 text-left text-[16px] font-medium text-ink transition-colors -outline-offset-4 hover:bg-fond md:hidden"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4 text-brand-text" aria-hidden="true" />
              Suchen
            </button>
          ) : null}
          <Link
            href={cta.href}
            onClick={() => setOpen(false)}
            className={`${BTN_PRIMARY} mx-[22px] mb-1.5 mt-3 rounded-[9px] px-3 py-3 text-center text-[15px] font-bold shadow-[0_8px_18px_-10px_rgba(0,0,0,.4)] md:hidden`}
          >
            {cta.label} →
          </Link>
        </nav>

        {search ? (
          <button
            type="button"
            onClick={openSearch}
            aria-label="Website durchsuchen"
            title="Suchen (/)"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-[10px] text-ink transition-colors hover:bg-fond hover:text-brand-text md:ml-0"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-[18px] w-[18px]" />
          </button>
        ) : null}

        <ThemeToggle className={search ? '' : 'ml-auto md:ml-0'} />

        <Link
          href={cta.href}
          className={`${BTN_PRIMARY} hidden min-h-11 items-center whitespace-nowrap rounded-[9px] px-[18px] text-[14px] font-semibold md:inline-flex`}
        >
          {cta.label}
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menü öffnen"
          aria-expanded={open}
          className="flex h-[42px] w-[42px] flex-col items-center justify-center gap-[5px] md:hidden"
        >
          <span
            className={`block h-[2.5px] w-6 rounded-sm bg-ink transition ${open ? 'translate-y-[7.5px] rotate-45' : ''}`}
          />
          <span className={`block h-[2.5px] w-6 rounded-sm bg-ink transition ${open ? 'opacity-0' : ''}`} />
          <span
            className={`block h-[2.5px] w-6 rounded-sm bg-ink transition ${open ? '-translate-y-[7.5px] -rotate-45' : ''}`}
          />
        </button>
      </div>
      {search ? <SearchDialog open={searching} onClose={() => setSearching(false)} /> : null}
    </header>
  )
}
