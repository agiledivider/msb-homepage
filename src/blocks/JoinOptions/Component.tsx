import Link from 'next/link'
import { Media, type MediaResource } from '../../components/Media'
import type { LinkValue } from '../fields'

type Option = {
  number?: string | null
  eyebrow?: string | null
  tint?: 'green' | 'light' | null
  title: string
  text?: string | null
  link?: LinkValue | null
}

export type JoinOptionsBlock = {
  blockType: 'joinOptions'
  options?: Option[] | null
  location?: {
    eyebrow?: string | null
    title?: string | null
    line?: string | null
    transit?: string | null
    map?: MediaResource
    mapPlaceholder?: string | null
  } | null
}

export function JoinOptionsComponent({ options, location }: JoinOptionsBlock) {
  return (
    <div className="pt-11 first:pt-0">
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(options ?? []).map((o, i) => {
          const green = o.tint === 'green'
          return (
            <div
              key={i}
              className={`rounded-[14px] p-[26px] ${
                green ? 'bg-brand text-white' : 'border border-line bg-[#fffdf8]'
              }`}
            >
              <div
                className={`mb-2.5 font-mono text-[11px] tracking-[.06em] ${green ? 'opacity-85' : 'text-faint'}`}
              >
                {o.number ? `${o.number} · ` : ''}
                {o.eyebrow}
              </div>
              <div className={`mb-2 font-display text-[22px] font-extrabold ${green ? 'text-white' : ''}`}>
                {o.title}
              </div>
              {o.text ? (
                <p className={`m-0 mb-4 text-[14px] leading-[1.6] ${green ? 'opacity-90' : 'text-muted'}`}>
                  {o.text}
                </p>
              ) : null}
              {o.link?.label ? (
                <Link
                  href={o.link.url || '#'}
                  className={`inline-block rounded-[9px] px-[18px] py-[11px] text-[14px] no-underline ${
                    green
                      ? 'bg-white font-bold text-brand-text'
                      : 'border border-[#cfc9ba] font-semibold text-ink'
                  }`}
                >
                  {o.link.label}
                </Link>
              ) : null}
            </div>
          )
        })}
      </div>

      {location ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[14px] border border-line bg-[#fffdf8] p-[26px]">
            <div className="mb-3 font-mono text-[11.5px] tracking-[.06em] text-faint">{location.eyebrow}</div>
            <div className="mb-1 font-display text-[20px] font-extrabold">{location.title}</div>
            {location.line ? <div className="mb-3.5 text-[15px] text-[#4c4a42]">{location.line}</div> : null}
            {location.transit ? (
              <div className="whitespace-pre-line font-mono text-[13px] leading-[1.8] text-muted">
                {location.transit}
              </div>
            ) : null}
          </div>
          <Media
            resource={location.map}
            placeholder={location.mapPlaceholder ?? 'Karte'}
            className="h-[210px] w-full overflow-hidden rounded-[14px]"
            sizes="(max-width:640px) 100vw, 560px"
          />
        </div>
      ) : null}
    </div>
  )
}
