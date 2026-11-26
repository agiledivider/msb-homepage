import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowRight,
  faBoxArchive,
  faCalendarDays,
  faHandshake,
  faNewspaper,
  faScrewdriverWrench,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CuttingMat } from '@/components/CuttingMat'
import { BTN_ON_DARK_HOVER, BTN_ON_DARK_SECONDARY, CARD_LINK, CARD_TITLE, SectionHeading } from '@/components/ui'

export const metadata: Metadata = { title: 'Seite nicht gefunden' }

/** Where people coming from a dead (often old Joomla) link most likely want to go. */
const PLACES: Array<{ href: string; title: string; text: string; icon: IconDefinition }> = [
  { href: '/events', title: 'Events', text: 'Was demnächst im MakerSpace passiert', icon: faCalendarDays },
  {
    href: '/events/archiv',
    title: 'Event-Archiv',
    text: 'Vergangene Veranstaltungen, auch von der alten Website',
    icon: faBoxArchive,
  },
  { href: '/blog', title: 'Blog', text: 'Berichte, Projekte und Neuigkeiten', icon: faNewspaper },
  {
    href: '/werkzeug',
    title: 'Werkzeug & Räume',
    text: 'Unsere Werkstätten und über 40 Maschinen',
    icon: faScrewdriverWrench,
  },
  { href: '/mitmachen', title: 'Mitmachen', text: 'Vorbeikommen, Mitglied werden, unterstützen', icon: faHandshake },
  { href: '/verein', title: 'Der Verein', text: 'Wer wir sind, Satzung, Unterstützer, Presse', icon: faUsers },
]

/**
 * 404 page. Also the source of `404.html` in the static bundle: the publish
 * step requests a deliberately missing path to capture it, and the host config
 * (nginx `error_page` / Apache `ErrorDocument`) serves it for unknown URLs.
 *
 * Server Component only, no live data: Next ships the root not-found with every
 * route, and a static 404.html would show stale events until the next publish.
 * Not counted in the statistics (`data-stats-skip`, S5.11).
 */
export default function NotFound() {
  return (
    // data-stats-skip: dead links are not counted as page views (S5.11, StatsBeacon)
    <main data-stats-skip="" className="mx-auto max-w-shell px-4 pb-[72px] pt-6 md:px-8 md:pt-10">
      <section>
        <CuttingMat>
          <div className="relative z-[1] grid items-center gap-6 pl-3 md:grid-cols-[1.25fr_.75fr] md:pl-2.5">
            <div>
              <p className="m-0 mb-3 font-mono text-[14px] text-green-300 md:mb-4">
                FEHLER 404<span className="max-sm:hidden"> · SEITE NICHT GEFUNDEN</span>
              </p>
              <h1 className="m-0 mb-3 font-display text-[32px] font-black leading-[1.02] tracking-[-0.02em] text-kreide sm:text-[40px] md:mb-4 md:text-[56px]">
                Hier ist nichts.
              </h1>
              <p className="m-0 mb-5 max-w-[34ch] text-[16px] leading-snug text-kreide md:mb-7 md:text-[19px] md:font-light">
                Diese Seite gibt es nicht (mehr). Viele Adressen unserer alten Website haben sich geändert, aber fast
                alles ist noch da.
              </p>
              <div className="flex gap-2.5 md:gap-3">
                <Link
                  href="/"
                  className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] bg-kreide px-3 py-3 text-center md:flex-none md:px-6 text-[15px] font-bold text-green-deep ${BTN_ON_DARK_HOVER}`}
                >
                  Zur Startseite
                </Link>
                <Link
                  href="/events"
                  className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] px-3 py-3 text-center md:flex-none md:px-6 text-[15px] font-bold ${BTN_ON_DARK_SECONDARY}`}
                >
                  Nächste Events
                </Link>
              </div>
            </div>

            {/* Decoration only: the number cut out of the mat, with a hand note. */}
            <div aria-hidden="true" className="relative max-md:hidden">
              <div className="select-none text-center font-mono text-[160px] font-semibold leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:2px_var(--color-mat-scale)] lg:text-[200px]">
                404
              </div>
              <div className="absolute right-2 bottom-[-6px] -rotate-6 font-hand text-[30px] text-green-300">
                falsch abgesägt?
              </div>
            </div>
          </div>
        </CuttingMat>
      </section>

      <section className="pt-10 md:pt-14">
        <SectionHeading tag="WEGWEISER" heading={'Vielleicht suchst du\u00a0…'} className="mb-5" />
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {PLACES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className={`flex h-full items-center gap-4 rounded-[14px] border border-line bg-card p-4 text-ink md:p-5 ${CARD_LINK}`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-pale text-brand-text">
                  <FontAwesomeIcon icon={p.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[17px] font-semibold ${CARD_TITLE}`}>{p.title}</span>
                  <span className="block text-[14px] leading-snug text-muted">{p.text}</span>
                </span>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-text"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
