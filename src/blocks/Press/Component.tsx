import { faArrowUpRightFromSquare, faEnvelope, faFilePdf } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SectionHeading, TEXT_LINK } from '../../components/ui'

type Doc = { url?: string | null; filename?: string | null; mimeType?: string | null }
type Item = {
  id?: string | null
  outlet: string
  title: string
  date: string
  url?: string | null
  document?: Doc | number | string | null
}

export type PressBlock = {
  blockType: 'press'
  tag?: string | null
  heading?: string | null
  intro?: string | null
  items?: Item[] | null
  contactEmail?: string | null
}

const BERLIN = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Berlin',
})

/** Where an item leads: an uploaded file wins over a link; null when it has neither (it is then left out). */
function target(item: Item): { href: string; isFile: boolean; isPdf: boolean } | null {
  const doc = typeof item.document === 'object' && item.document ? item.document : null
  if (doc?.url) return { href: doc.url, isFile: true, isPdf: doc.mimeType === 'application/pdf' }
  if (item.url) return { href: item.url, isFile: false, isPdf: false }
  return null
}

export function PressComponent({ tag, heading, intro, items, contactEmail }: PressBlock) {
  const shown = (items ?? [])
    .flatMap((item) => {
      const to = target(item)
      return to ? [{ item, to }] : []
    })
    .sort((a, b) => Date.parse(b.item.date) - Date.parse(a.item.date))
  if (!shown.length) return null

  return (
    <section className="pt-11 first:pt-0">
      <SectionHeading tag={tag ?? undefined} heading={heading ?? undefined} className="mb-4" />
      {intro ? <p className="m-0 mb-6 max-w-[62ch] text-[16.5px] leading-[1.7] text-ink">{intro}</p> : null}

      <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-[12px] border border-line bg-card p-0">
        {shown.map(({ item, to }) => (
          <li key={item.id ?? `${item.date}-${item.title}`} className="px-[22px] py-4">
            <div className="font-mono text-[14px] tracking-[.04em] text-muted">
              {BERLIN.format(new Date(item.date))} · {item.outlet}
            </div>
            <a
              href={to.href}
              {...(to.isFile ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
              // Inline (not flex), so a wrapped title keeps its icon after the last word; py keeps the 44px target.
              className={`mt-1 inline-block py-2.5 text-[16.5px] leading-[1.5] font-semibold ${TEXT_LINK}`}
            >
              {item.title}
              {to.isPdf ? (
                <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-normal">
                  <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" aria-hidden />
                  PDF
                </span>
              ) : to.isFile ? null : (
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  className="ml-2 inline h-3 w-3 align-[-1px]"
                  aria-label="öffnet in neuem Tab"
                />
              )}
            </a>
          </li>
        ))}
      </ul>

      {contactEmail ? (
        <p className="m-0 mt-4 flex flex-wrap items-center gap-x-2 text-[15px] text-ink">
          <span className="font-semibold">Presseanfragen:</span>
          <a href={`mailto:${contactEmail}`} className={`inline-flex min-h-11 items-center gap-2 ${TEXT_LINK}`}>
            <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {contactEmail}
          </a>
        </p>
      ) : null}
    </section>
  )
}
