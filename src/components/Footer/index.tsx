import Link from 'next/link'
import type { NavItem } from '../Header'

const DEFAULT_LINKS: NavItem[] = [
  { label: 'Der Verein', href: '/verein' },
  { label: 'Werkzeug & Räume', href: '/werkzeug' },
  { label: 'Events & Workshops', href: '/events' },
  { label: 'Mitmachen', href: '/mitmachen' },
]

export function Footer({
  logoSrc = '/makerspacebonn_logo.png',
  links = DEFAULT_LINKS,
}: {
  logoSrc?: string
  links?: NavItem[]
}) {
  return (
    <footer className="bg-green-deep text-[#d7d2c4]">
      <div className="mx-auto grid max-w-shell grid-cols-1 gap-10 px-8 pb-[34px] pt-[52px] md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="mb-3.5 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="MakerSpace Bonn Logo" className="block h-9 w-9 object-contain" />
            <span className="font-display text-[17px] font-extrabold text-white">MakerSpace Bonn e.V.</span>
          </div>
          <p className="m-0 mb-3.5 max-w-[320px] text-[14px] leading-[1.65] text-[#a49f92]">
            Eine offene Werkstatt für Bonn. Für alle. <span className="italic">An open workshop for everyone.</span>
          </p>
          <p className="m-0 font-mono text-[12.5px] leading-[1.7] text-[#8f8a7d]">
            Kennedyallee 18 · 53175 Bonn
            <br />
            Tel: +49 (228) 81 28 69 80
            <br />
            ÖPNV: Linie 16/63 Hochkreuz/Deutsches Museum
          </p>
        </div>

        <div>
          <div className="mb-3.5 font-mono text-[12px] tracking-[.08em] text-[#7f7a6d]">SEITEN</div>
          <div className="flex flex-col gap-2.5 text-[14px]">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-[#d7d2c4] no-underline">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3.5 font-mono text-[12px] tracking-[.08em] text-[#7f7a6d]">MITMACHEN</div>
          <p className="m-0 mb-3.5 text-[14px] leading-[1.6] text-[#a49f92]">
            Werde Mitglied oder unterstütze uns mit einer Spende.
          </p>
          <Link
            href="/mitmachen"
            className="inline-block rounded-[8px] bg-green-lime px-4 py-2.5 text-[13.5px] font-bold text-ink no-underline"
          >
            Jetzt unterstützen →
          </Link>
        </div>
      </div>

      <div className="border-t border-[#24401c]">
        <div className="mx-auto flex max-w-shell flex-wrap justify-between gap-3 px-8 py-4 font-mono text-[12px] text-[#7f7a6d]">
          <span>© 2026 MakerSpace Bonn e.V. · Gemeinnützig seit 2018</span>
          <span className="flex gap-[18px]">
            <Link href="/impressum" className="text-[#7f7a6d] no-underline">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-[#7f7a6d] no-underline">
              Datenschutz
            </Link>
            <Link href="/haftung" className="text-[#7f7a6d] no-underline">
              Haftung
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
