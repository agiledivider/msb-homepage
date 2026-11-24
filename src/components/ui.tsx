import Link from 'next/link'
import type { LinkValue } from '../blocks/fields'

/* ===== Link system (styleguide 2026-11.11 §7 + "Zustände") =====
   Text links are always underlined; hover thickens the line and shifts the
   colour. Focus is the global 3px ring from globals.css; dark surfaces switch
   it to Kreide by setting `--focus-ring` (ON_DARK). Cards and rows that are a
   link as a whole mark hover on their title. Buttons shift their background. */

/** Inline/standalone text link on light surfaces (Papier, Fläche, Fond). */
export const TEXT_LINK =
  'text-brand-text underline decoration-1 underline-offset-2 hover:text-link-hover hover:decoration-2'
/** Text link on Grün 800/900 (footer): Kreide, hover Grün 300 (4.7:1) + underline. */
// Footer links: no underline at rest, on purpose. This breaks styleguide §7
// ("Links immer unterstreichen") for the footer only (Falk, 2026-11-22); hover
// turns them Grün 300 and underlines them, focus shows the Kreide ring.
export const TEXT_LINK_ON_DARK =
  'text-kreide no-underline underline-offset-2 hover:text-green-300 hover:underline hover:decoration-2'
/** "alle Events →" style mono link that stands on its own: 44px tall target. */
export const MONO_LINK = `inline-flex min-h-11 items-center whitespace-nowrap font-mono text-[14px] ${TEXT_LINK}`
/** Rich text: the same rule applied to every <a> inside. */
export const PROSE_LINKS =
  '[&_a]:text-brand-text [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-2 [&_a:hover]:text-link-hover [&_a:hover]:decoration-2'
/** Put on a dark surface (footer, CTA band, cutting mat): the focus ring turns Kreide. */
export const ON_DARK = '[--focus-ring:var(--color-kreide)]'
/** Whole card is a link: lifts, border turns green; pair with CARD_TITLE on the heading. */
export const CARD_LINK =
  'group block no-underline transition-[translate,border-color,box-shadow] duration-150 hover:border-brand-text motion-safe:hover:-translate-y-0.5'
/** Title inside a CARD_LINK / row link: green + underlined while the card is hovered. */
export const CARD_TITLE = 'decoration-2 underline-offset-2 group-hover:text-brand-text group-hover:underline'

/** Primary button: Grün 600 → Grün 800 (light), Grün 500 → Grün 300 with ink text (dark). */
export const BTN_PRIMARY = 'bg-button text-button-text no-underline transition-colors hover:bg-button-hover'
/** Secondary button on light: line border → green border on Grüner Fond. */
export const BTN_SECONDARY =
  'border border-line bg-card text-ink no-underline transition-colors hover:border-brand-text hover:bg-green-pale hover:text-brand-text'
/** Primary button on dark (Kreide or orange at rest): hover flips to Markengrün with ink. */
export const BTN_ON_DARK_HOVER = 'no-underline transition-colors hover:bg-brand hover:text-tinte'
/** Outline button on dark: Kreide border → filled Kreide with Grün 800 text. */
export const BTN_ON_DARK_SECONDARY =
  'border-[1.5px] border-kreide text-kreide no-underline transition-colors hover:bg-kreide hover:text-green-deep'

/** Slightly-rotated "label tape" tag used at the top of most sections. */
export function TapeTag({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'orange' }) {
  // 'orange' = Maker-Orange, green = Markengrün; both carry an ink label (never white).
  // Mitglieder-Gelb is reserved for member content.
  const bg = color === 'orange' ? 'bg-orange text-tinte' : 'bg-brand text-tinte'
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
        <Link href={link.url || '#'} className={MONO_LINK}>
          {link.label}
        </Link>
      ) : null}
    </div>
  )
}

export const eventTagClasses = (color?: string | null) =>
  color === 'orange'
    ? 'bg-fond-gelb text-text-gelb' // Gelber Fond + Ocker (palette roles)
    : color === 'neutral'
      ? 'bg-fond text-muted'
      : 'bg-green-pale text-brand-text'
