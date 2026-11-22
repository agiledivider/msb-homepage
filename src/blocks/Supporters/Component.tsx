import type { CSSProperties } from 'react'
import { SectionHeading } from '../../components/ui'

type Logo = { url?: string | null; alt?: string | null }
type Supporter = {
  id?: string | null
  name: string
  url?: string | null
  description?: string | null
  logo?: Logo | number | string | null
  current?: boolean | null
}

export type SupportersBlock = {
  blockType: 'supporters'
  tag?: string | null
  heading?: string | null
  intro?: string | null
  formerHeading?: string | null
  supporters?: Supporter[] | null
}

const logoUrl = (s: Supporter) => (typeof s.logo === 'object' && s.logo?.url ? s.logo.url : null)

/**
 * One supporter. Current supporters (`lg`) show their logo in its own colours
 * (Falk 2026-11-22). Former ones show it in a single colour (a mask filled with
 * the muted ink), cross-fading to the logo's own colours on hover or keyboard
 * focus. Without a logo the name stands in. Linked when there is a URL.
 */
function SupporterMark({ s, size }: { s: Supporter; size: 'lg' | 'sm' }) {
  const url = logoUrl(s)
  // Same height for every logo (square logos stay legible), natural width up to a cap so long wordmarks don't dominate.
  const box = size === 'lg' ? 'h-16 max-w-[16rem]' : 'h-14 max-w-[15rem]'
  const mark = url ? (
    size === 'lg' ? (
      <span className={`block ${box}`}>
        {/* biome-ignore lint/performance/noImgElement: SVG logos, no responsive sizes needed */}
        <img src={url} alt={s.name} className="block h-full w-auto max-w-full object-contain object-left" />
      </span>
    ) : (
      <span className={`relative block ${box}`}>
        {/* biome-ignore lint/performance/noImgElement: SVG logos, no responsive sizes needed */}
        <img
          src={url}
          alt={s.name}
          className="block h-full w-auto max-w-full object-contain object-left opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
        <span
          aria-hidden
          style={{ '--logo': `url(${url})` } as CSSProperties}
          className="absolute inset-0 bg-muted transition-opacity duration-200 [mask-image:var(--logo)] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain] group-hover:opacity-0 group-focus-visible:opacity-0"
        />
      </span>
    )
  ) : (
    <span
      className={`inline-flex ${size === 'lg' ? 'h-16' : 'h-14'} items-center font-sans text-[17px] font-bold text-muted transition-colors group-hover:text-brand-text group-focus-visible:text-brand-text`}
    >
      {s.name}
    </span>
  )
  return s.url ? (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      title={s.name}
      className="group inline-flex min-h-11 items-center rounded-[6px]"
    >
      {mark}
    </a>
  ) : (
    <span title={s.name} className="group inline-flex min-h-11 items-center">
      {mark}
    </span>
  )
}

function Group({ items, size }: { items: Supporter[]; size: 'lg' | 'sm' }) {
  // Supporters with a text get a row of their own: logo, then the text beside it (below on phones).
  if (items.some((s) => s.description)) {
    return (
      <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-[12px] border border-line bg-card p-0">
        {items.map((s) => (
          <li
            key={s.id ?? s.name}
            className="flex flex-col gap-3 px-[22px] py-5 md:flex-row md:items-center md:gap-10 md:px-8"
          >
            <div className="shrink-0 md:w-64">
              <SupporterMark s={s} size={size} />
            </div>
            {s.description ? (
              <p className="m-0 max-w-[62ch] text-[16.5px] leading-[1.7] text-ink">{s.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-x-12 gap-y-6 rounded-[12px] border border-line bg-card p-[22px] md:px-8">
      {items.map((s) => (
        <li key={s.id ?? s.name}>
          <SupporterMark s={s} size={size} />
        </li>
      ))}
    </ul>
  )
}

export function SupportersComponent({ tag, heading, intro, formerHeading, supporters }: SupportersBlock) {
  const all = supporters ?? []
  const current = all.filter((s) => s.current !== false)
  const former = all.filter((s) => s.current === false)
  if (!all.length) return null

  return (
    <section className="pt-11 first:pt-0">
      <SectionHeading tag={tag ?? undefined} heading={heading ?? undefined} className="mb-4" />
      {intro ? <p className="m-0 mb-6 max-w-[62ch] text-[16.5px] leading-[1.7] text-ink">{intro}</p> : null}
      {current.length ? <Group items={current} size="lg" /> : null}
      {former.length ? (
        <>
          <h3 className="m-0 mt-8 mb-3 font-mono text-[14px] font-normal tracking-[.08em] text-muted uppercase">
            {formerHeading || 'Frühere Förderer'}
          </h3>
          <Group items={former} size="sm" />
        </>
      ) : null}
    </section>
  )
}
