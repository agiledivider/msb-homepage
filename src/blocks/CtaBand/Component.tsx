import Link from 'next/link'
import { BTN_ON_DARK_HOVER, BTN_ON_DARK_SECONDARY, ON_DARK } from '../../components/ui'
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
    <div
      className={`mt-[52px] flex flex-wrap items-center justify-between gap-9 rounded-[18px] bg-green-deep p-11 text-kreide ${ON_DARK}`}
    >
      <div>
        <h2 className="m-0 mb-2 font-display text-[32px] font-extrabold text-kreide">{heading}</h2>
        {text ? <p className="m-0 max-w-[460px] text-[16px]">{text}</p> : null}
      </div>
      <div className="flex flex-wrap gap-3.5">
        {primary?.label ? (
          <Link
            href={primary.url || '#'}
            className={`rounded-[10px] bg-kreide px-6 py-3.5 text-[15px] font-bold text-green-deep ${BTN_ON_DARK_HOVER}`}
          >
            {primary.label}
          </Link>
        ) : null}
        {secondary?.label ? (
          <Link
            href={secondary.url || '#'}
            className={`rounded-[10px] px-6 py-3.5 text-[15px] font-semibold ${BTN_ON_DARK_SECONDARY}`}
          >
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
