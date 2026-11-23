import Link from 'next/link'
import { BTN_PRIMARY, CARD_LINK, CARD_TITLE, SectionHeading } from '../../components/ui'
import type { LinkValue } from '../fields'
import type { ToolIconName } from './icons'
import { isToolIcon, ToolIcon } from './ToolIcon'

type Item = {
  code?: string | null
  title: string
  verbs?: string | null
  desc?: string | null
  icon?: ToolIconName | null
  url?: string | null
}

export type WorkshopsBlock = {
  blockType: 'workshops'
  variant?: 'preview' | 'detailed' | null
  tagLabel?: string | null
  tagColor?: 'green' | 'orange' | null
  heading?: string | null
  allLink?: LinkValue | null
  note?: string | null
  items?: Item[] | null
  hint?: string | null
  hintCta?: LinkValue | null
  footnote?: string | null
}

/** In-page anchor for a workshop on /werkzeug: "Elektronik & Löten" → "elektronik-loeten". */
export const workshopAnchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const CARD_BASE = 'relative rounded-[10px] border border-line bg-card shadow-[0_10px_22px_-14px_rgba(60,52,30,.5)]'

/** One workshop: the tool hangs at the left, text beside it; the whole card is
 *  the link (UX mockup B1 "Lochwand mit Haken", 2026-11-23). */
function Card({ it, detailed }: { it: Item; detailed: boolean }) {
  const icon = isToolIcon(it.icon) ? it.icon : null
  const body = (
    <>
      {icon ? (
        <ToolIcon
          name={icon}
          className={`shrink-0 ${detailed ? 'h-[92px] w-[38px]' : 'h-14 w-[24px] sm:h-[76px] sm:w-8'} transition-transform duration-150 motion-safe:group-hover:-rotate-6`}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        {detailed && it.code ? (
          <span className="mb-1.5 block font-mono text-[14px] text-brand-text">{it.code}</span>
        ) : null}
        <span
          className={`block font-sans font-bold leading-tight ${detailed ? 'text-[21px]' : 'text-[16px] sm:text-[18px]'} ${it.url ? CARD_TITLE : ''}`}
        >
          {it.title}
        </span>
        {it.verbs ? (
          <span
            className={`mt-0.5 block leading-snug ${detailed ? 'text-[16px] text-ink' : 'text-[14px] text-muted sm:text-[15px] sm:text-ink'}`}
          >
            {it.verbs}
          </span>
        ) : null}
        {it.desc ? (
          <span
            className={`mt-1.5 text-[14px] text-muted ${detailed ? 'block leading-[1.6]' : 'hidden leading-[1.5] sm:block'}`}
          >
            {it.desc}
          </span>
        ) : null}
      </span>
      {it.url ? (
        <span
          aria-hidden
          className="self-center font-mono text-[18px] text-brand-text transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
        >
          →
        </span>
      ) : null}
    </>
  )
  const layout = `flex items-start gap-3.5 ${detailed ? 'p-[22px]' : 'p-3 sm:p-4'}`
  const id = detailed ? workshopAnchor(it.title) : undefined
  return it.url ? (
    <Link id={id} href={it.url} className={`${CARD_BASE} ${CARD_LINK} ${layout} scroll-mt-28 text-ink`}>
      {body}
    </Link>
  ) : (
    <div id={id} className={`${CARD_BASE} ${layout} scroll-mt-28`}>
      {body}
    </div>
  )
}

export function WorkshopsComponent({
  variant,
  tagLabel,
  tagColor,
  heading,
  allLink,
  note,
  items,
  hint,
  hintCta,
  footnote,
}: WorkshopsBlock) {
  const detailed = variant === 'detailed'
  return (
    <div className="pt-14 first:pt-0">
      {tagLabel || heading ? (
        <SectionHeading
          tag={tagLabel ?? undefined}
          tagColor={tagColor ?? 'orange'}
          heading={heading ?? undefined}
          link={allLink}
          className="mb-[18px]"
        />
      ) : null}

      <div className="relative rounded-[14px] border border-pegboard-edge bg-pegboard px-3 py-4 shadow-[inset_0_1px_10px_rgba(70,55,25,.08),inset_0_0_0_1px_rgba(255,255,255,.25)] [background-image:radial-gradient(circle,rgba(48,35,16,.2)_0_2.4px,transparent_3px),radial-gradient(circle,rgba(48,35,16,.08)_0_3.5px,transparent_4.1px),radial-gradient(circle,rgba(255,253,247,.6)_0_3.5px,transparent_4.1px)] [background-size:44px_44px] [background-position:0_0,1px_1px,-1px_-1px] sm:px-[30px] sm:py-[34px]">
        {note ? (
          <div className="absolute -top-3.5 right-[26px] -rotate-3 font-hand text-[23px] font-bold text-brand-text">
            {note}
          </div>
        ) : null}
        <div className={`grid gap-2 sm:gap-4 ${detailed ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'}`}>
          {(items ?? []).map((it) => (
            <Card key={it.title} it={it} detailed={detailed} />
          ))}
        </div>

        {hint || hintCta?.url ? (
          <div className="mt-3 flex flex-col gap-3 rounded-[10px] border border-dashed border-pegboard-edge bg-card px-4 py-3 text-[14px] leading-snug sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:text-[15px]">
            {hint ? <p className="m-0">{hint}</p> : <span />}
            {hintCta?.url ? (
              <Link
                href={hintCta.url}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-[8px] px-4 text-[14px] font-bold ${BTN_PRIMARY}`}
              >
                {hintCta.label || 'Mehr erfahren'}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {footnote ? <p className="m-0 mt-4 font-mono text-[14px] text-muted">{footnote}</p> : null}
    </div>
  )
}
