import { faFile, faFilePdf } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SectionHeading, TEXT_LINK } from '../../components/ui'

type Doc = { url?: string | null; filename?: string | null; mimeType?: string | null }
type Item = {
  id?: string | null
  title: string
  version: string
  document?: Doc | number | string | null
}

export type DocumentsBlock = {
  blockType: 'documents'
  tag?: string | null
  heading?: string | null
  intro?: string | null
  items?: Item[] | null
}

/** The file behind an item, or null when it isn't populated (the item is then left out). */
function fileOf(item: Item): { href: string; isPdf: boolean } | null {
  const doc = typeof item.document === 'object' && item.document ? item.document : null
  return doc?.url ? { href: doc.url, isPdf: doc.mimeType === 'application/pdf' } : null
}

export function DocumentsComponent({ tag, heading, intro, items }: DocumentsBlock) {
  const shown = (items ?? []).flatMap((item) => {
    const file = fileOf(item)
    return file ? [{ item, file }] : []
  })
  if (!shown.length) return null

  return (
    <section className="pt-11 first:pt-0">
      <SectionHeading tag={tag ?? undefined} heading={heading ?? undefined} className="mb-4" />
      {intro ? <p className="m-0 mb-6 max-w-[62ch] text-[16.5px] leading-[1.7] text-ink">{intro}</p> : null}

      {/* One card, documents side by side (3 today, a 4th still fits) with lines between; stacked on phones. */}
      <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-[12px] border border-line bg-card p-0 md:flex-row md:divide-x md:divide-y-0">
        {shown.map(({ item, file }) => (
          <li key={item.id ?? item.title} className="min-w-0 px-[22px] py-3 md:flex-1 md:py-5">
            <a
              href={file.href}
              // py keeps the 44px target; inline so a wrapped title keeps its marker after the last word.
              className={`inline-block py-2 text-[16.5px] leading-[1.5] font-semibold ${TEXT_LINK}`}
            >
              <FontAwesomeIcon
                icon={file.isPdf ? faFilePdf : faFile}
                className="mr-2 inline h-4 w-4 align-[-2px]"
                aria-hidden
              />
              {item.title}
              {file.isPdf ? <span className="ml-2 whitespace-nowrap text-[14px] font-normal">PDF</span> : null}
            </a>
            <div className="font-mono text-[14px] tracking-[.04em] text-muted">{item.version}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
