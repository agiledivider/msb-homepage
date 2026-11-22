import Link from 'next/link'
import type { NavItem } from '../Header'

const DEFAULT_LINKS: NavItem[] = [
  { label: 'Der Verein', href: '/verein' },
  { label: 'Werkzeug & Räume', href: '/werkzeug' },
  { label: 'Events & Workshops', href: '/events' },
  { label: 'Mitmachen', href: '/mitmachen' },
]

export function Footer({
  logoSrc = '/logo/logo-horizontal-white.png',
  links = DEFAULT_LINKS,
}: {
  logoSrc?: string
  links?: NavItem[]
}) {
  return (
    <footer className="bg-green-deep text-kreide">
      <div className="mx-auto grid max-w-shell grid-cols-1 gap-10 px-8 pb-[34px] pt-[52px] md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="mb-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="MakerSpace Bonn" className="block h-12 w-auto" />
          </div>
          <p className="m-0 mb-3.5 max-w-[320px] text-[14px] leading-[1.65] text-kreide">
            Eine offene Werkstatt für Bonn. Für alle. <span className="italic">An open workshop for everyone.</span>
          </p>
          <p className="m-0 font-mono text-[14px] leading-[1.7] text-kreide">
            Kennedyallee 18 · 53175 Bonn
            <br />
            Tel: +49 (228) 81 28 69 80
            <br />
            ÖPNV: Linie 16/63 Hochkreuz/Deutsches Museum
          </p>
        </div>

        <div>
          <div className="mb-3.5 font-mono text-[14px] tracking-[.08em] text-kreide">SEITEN</div>
          <div className="flex flex-col gap-2.5 text-[14px]">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-kreide no-underline">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3.5 font-mono text-[14px] tracking-[.08em] text-kreide">MITMACHEN</div>
          <p className="m-0 mb-3.5 text-[14px] leading-[1.6] text-kreide">
            Werde Mitglied oder unterstütze uns mit einer Spende.
          </p>
          <Link
            href="/mitmachen"
            className="inline-block rounded-[8px] bg-brand px-4 py-2.5 text-[14px] font-bold text-ink no-underline"
          >
            Jetzt unterstützen →
          </Link>
        </div>
      </div>

      <div className="border-t border-green-900">
        <div className="mx-auto flex max-w-shell flex-wrap justify-between gap-3 px-8 py-4 font-mono text-[14px] text-kreide">
          <span>© 2026 MakerSpace Bonn e.V. · Gemeinnützig seit 2018</span>
          <span className="flex gap-[18px]">
            <Link href="/impressum" className="text-kreide no-underline">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-kreide no-underline">
              Datenschutz
            </Link>
            <Link href="/haftung" className="text-kreide no-underline">
              Haftung
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
