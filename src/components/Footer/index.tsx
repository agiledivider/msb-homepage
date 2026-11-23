import Link from 'next/link'
import type { NavItem } from '../Header'
import { MapCard } from '../MapCard'
import { ON_DARK, TEXT_LINK_ON_DARK } from '../ui'
import { type SocialLink, SocialLinks } from './SocialLinks'

const DEFAULT_LINKS: NavItem[] = [
  { label: 'Der Verein', href: '/verein' },
  { label: 'Werkzeug & Räume', href: '/werkzeug' },
  { label: 'Events & Workshops', href: '/events' },
  { label: 'Blog', href: '/blog' },
  { label: 'Mitmachen', href: '/mitmachen' },
]

const DEFAULT_TAGLINE = 'Eine offene Werkstatt für Bonn. Für alle.'
const DEFAULT_PHONE = '+49 228 81 28 69 80'
const DEFAULT_EMAIL = 'office@makerspacebonn.de'

/** `tel:` target from a display number: keep the leading + and the digits. */
const telHref = (phone: string) => `tel:${phone.trim().startsWith('+') ? '+' : ''}${phone.replace(/\D/g, '')}`

export function Footer({
  logoSrc = '/logo/logo-horizontal-white.png',
  links = DEFAULT_LINKS,
  tagline = DEFAULT_TAGLINE,
  phone = DEFAULT_PHONE,
  email = DEFAULT_EMAIL,
  social = [],
}: {
  logoSrc?: string
  links?: NavItem[]
  tagline?: string
  phone?: string
  email?: string
  social?: SocialLink[]
}) {
  return (
    <footer className={`bg-green-deep text-kreide ${ON_DARK}`}>
      <div className="mx-auto grid max-w-shell grid-cols-1 gap-10 px-8 pb-[34px] pt-[52px] md:grid-cols-[1.2fr_1.3fr_1fr]">
        {/* Brand column: who we are and how to reach us. */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-3.5">
              {/* biome-ignore lint/performance/noImgElement: static logo PNG sized by CSS height; next/image needs fixed dimensions and adds nothing here */}
              <img src={logoSrc} alt="MakerSpace Bonn" className="block h-12 w-auto" />
            </div>
            <p className="m-0 max-w-[320px] text-[14px] leading-[1.65] text-kreide">{tagline}</p>
          </div>

          <div>
            <p className="m-0 font-mono text-[14px] leading-[1.8] text-kreide">
              <a href={telHref(phone)} className={TEXT_LINK_ON_DARK}>
                {phone}
              </a>
              <br />
              <a href={`mailto:${email}`} className={TEXT_LINK_ON_DARK}>
                {email}
              </a>
            </p>
          </div>

          <p className="m-0 font-mono text-[14px] leading-[1.7] text-kreide">
            Kennedyallee 18 · 53175 Bonn
            <br />
            <span className="text-green-300">ÖPNV</span> Linie 16/63
            <br />
            Hochkreuz/Deutsches Museum
          </p>

          {social.length ? <SocialLinks items={social} /> : null}
        </div>

        {/* Anfahrt: same label rhythm as MITMACHEN/SEITEN, just the map (the
            address sits in the brand column). The whole column hides when the
            page body already shows a map (/mitmachen): CSS :has(), so it works
            in the static export without route props. */}
        <div className="[body:has([data-location-map]:not(footer_*))_&]:hidden">
          <div className="mb-3.5 font-mono text-[14px] tracking-[.08em] text-kreide">ANFAHRT</div>
          <MapCard links="icons" sizes="(max-width:767px) 100vw, 400px" />
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <div className="mb-3.5 font-mono text-[14px] tracking-[.08em] text-kreide">MITMACHEN</div>
            <p className="m-0 mb-3.5 text-[14px] leading-[1.6] text-kreide">
              Werde Mitglied oder unterstütze uns mit einer Spende.
            </p>
            <Link
              href="/mitmachen"
              className="inline-flex min-h-11 items-center rounded-[8px] bg-brand px-4 text-[14px] font-bold text-ink no-underline transition-colors hover:bg-kreide hover:text-green-deep"
            >
              Jetzt unterstützen →
            </Link>
          </div>

          <div>
            <div className="mb-3.5 font-mono text-[14px] tracking-[.08em] text-kreide">SEITEN</div>
            <div className="flex flex-col gap-2.5 text-[14px]">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={`self-start ${TEXT_LINK_ON_DARK}`}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-green-900">
        <div className="mx-auto flex max-w-shell flex-wrap justify-between gap-3 px-8 py-4 font-mono text-[14px] text-kreide">
          <span>© 2026 MakerSpace Bonn e.V. · Gemeinnützig seit 2018</span>
          <span className="flex gap-[18px]">
            <Link href="/impressum" className={TEXT_LINK_ON_DARK}>
              Impressum
            </Link>
            <Link href="/datenschutz" className={TEXT_LINK_ON_DARK}>
              Datenschutz
            </Link>
            <Link href="/haftung" className={TEXT_LINK_ON_DARK}>
              Haftung
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
