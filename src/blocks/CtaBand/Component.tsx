import Link from 'next/link'
import type { LinkValue } from '../fields'

export type CtaBandBlock = {
  blockType: 'ctaBand'
  heading: string
  text?: string | null
  primary?: LinkValue | null
  secondary?: LinkValue | null
}

export function CtaBandComponent({ heading, text, primary, secondary }: CtaBandBlock) {
  return (
    <div className="mt-[52px] flex flex-wrap items-center justify-between gap-9 rounded-[18px] bg-brand p-11 text-white">
      <div>
        <h2 className="m-0 mb-2 font-display text-[32px] font-extrabold text-white">{heading}</h2>
        {text ? <p className="m-0 max-w-[460px] text-[16px] opacity-90">{text}</p> : null}
      </div>
      <div className="flex flex-wrap gap-3.5">
        {primary?.label ? (
          <Link
            href={primary.url || '#'}
            className="rounded-[10px] bg-white px-6 py-3.5 text-[15px] font-bold text-brand-text no-underline"
          >
            {primary.label}
          </Link>
        ) : null}
        {secondary?.label ? (
          <Link
            href={secondary.url || '#'}
            className="rounded-[10px] border-[1.5px] border-white/60 px-6 py-3.5 text-[15px] font-semibold text-white no-underline"
          >
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
