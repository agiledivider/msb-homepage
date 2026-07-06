'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type NavItem = { label: string; href: string }

const DEFAULT_NAV: NavItem[] = [
  { label: 'Start', href: '/' },
  { label: 'Verein', href: '/verein' },
  { label: 'Werkzeug & Räume', href: '/werkzeug' },
  { label: 'Events', href: '/events' },
  { label: 'Mitmachen', href: '/mitmachen' },
]

export function Header({
  logoSrc = '/makerspacebonn_logo.png',
  nav = DEFAULT_NAV,
  cta = { label: 'Mitglied werden', href: '/mitmachen' },
}: {
  logoSrc?: string
  nav?: NavItem[]
  cta?: NavItem
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href))

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[rgba(244,241,233,.92)] backdrop-blur-[8px]">
      <div className="relative mx-auto flex max-w-shell items-center justify-between gap-6 px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="MakerSpace Bonn Logo" className="block h-10 w-10 object-contain" />
          <span className="font-display text-[19px] font-extrabold tracking-[-.01em] text-ink">
            MakerSpace <span className="font-semibold text-faint">Bonn</span>
          </span>
        </Link>

        <nav
          className={`${
            open ? 'flex' : 'hidden'
          } absolute inset-x-0 top-full flex-col items-stretch border-b border-line border-t border-t-line bg-[#f4f1e9] py-1.5 shadow-[0_18px_34px_-18px_rgba(60,52,30,.55)] md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:py-0 md:shadow-none`}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`border-b border-[#ece7db] px-[22px] py-3.5 text-[16px] font-medium no-underline md:border-0 md:p-0 md:text-[15px] ${
                isActive(item.href) ? 'text-green' : 'text-[#54503f]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={cta.href}
            onClick={() => setOpen(false)}
            className="mx-[22px] mb-1.5 mt-3 rounded-[9px] bg-green px-3 py-3 text-center text-[15px] font-bold text-white no-underline shadow-[0_8px_18px_-10px_rgba(0,0,0,.4)] md:hidden"
          >
            {cta.label} →
          </Link>
        </nav>

        <Link
          href={cta.href}
          className="hidden whitespace-nowrap rounded-[9px] bg-green px-[18px] py-2.5 text-[14px] font-semibold text-white no-underline md:block"
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
    </header>
  )
}
