import Link from 'next/link'
import type { LinkValue } from '../blocks/fields'

/** Slightly-rotated "label tape" tag used at the top of most sections. */
export function TapeTag({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'orange' }) {
  // 'orange' = the warm brand accent (UGC yellow, ink label); green = Markengrün with ink label (never white)
  const bg = color === 'orange' ? 'bg-yellow text-ink' : 'bg-brand text-ink'
  return (
    <span
      className={`${bg} inline-block -rotate-2 whitespace-nowrap rounded-[3px] px-2.5 py-[5px] font-mono text-[14px] font-semibold tracking-[.08em] shadow-[0_3px_8px_-4px_rgba(0,0,0,.35)]`}
    >
      {children}
    </span>
  )
}

/** Section header: tape tag + heading (+ optional meta line and "see all" link). */
export function SectionHeading({
  tag,
  tagColor = 'green',
  heading,
  meta,
  link,
  className,
}: {
  tag?: string
  tagColor?: 'green' | 'orange'
  heading?: string
  meta?: string
  link?: LinkValue | null
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${className ?? ''}`}>
      <div className="flex items-center gap-3.5">
        {tag ? <TapeTag color={tagColor}>{tag}</TapeTag> : null}
        {heading ? <h2 className="m-0 font-display text-[26px] font-extrabold">{heading}</h2> : null}
        {meta ? <span className="font-mono text-[14px] text-muted">{meta}</span> : null}
      </div>
      {link?.label ? (
        <Link href={link.url || '#'} className="whitespace-nowrap font-mono text-[14px] text-brand-text no-underline">
          {link.label}
        </Link>
      ) : null}
    </div>
  )
}

export const eventTagClasses = (color?: string | null) =>
  color === 'orange'
    ? 'bg-[#fdf2d6] text-[#8a6200]' // soft UGC-yellow tag
    : color === 'neutral'
      ? 'bg-[#ece7dd] text-muted'
      : 'bg-green-pale text-brand-text'
