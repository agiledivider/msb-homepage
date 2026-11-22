import Link from 'next/link'
import { Media, type MediaResource } from '../../components/Media'
import type { LinkValue } from '../fields'

/** Stylised brand map used when no map image is uploaded in the CMS. Lives in
 *  /public/media; an editor-uploaded `location.map` still overrides it. */
const FALLBACK_MAP: MediaResource = {
  url: '/media/karte-kennedyallee.webp',
  alt: 'Karte: MakerSpace Bonn, Kennedyallee 18, 53175 Bonn',
  width: 1400,
  height: 939,
}
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=MakerSpace Bonn,+53175+Bonn'
/** Where the MakerSpace sits on the stylised base map (percent of the image).
 *  Kennedyallee 18 (50.69817, 7.14513) is on the SW side of Kennedyallee, just
 *  west of the Burgfriedhof green — i.e. upper-right, on the road left of the
 *  big green block. Matches the red pin in the source screenshot (~68%/22%). */
const MARKER_POS = { left: '63%', top: '23%' }

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
              className={`rounded-[14px] p-[26px] ${green ? 'bg-brand text-ink' : 'border border-line bg-[#fffdf8]'}`}
            >
              <div className={`mb-2.5 font-mono text-[14px] tracking-[.06em] ${green ? '' : 'text-muted'}`}>
                {o.number ? `${o.number} · ` : ''}
                {o.eyebrow}
              </div>
              <div className="mb-2 font-display text-[22px] font-extrabold">{o.title}</div>
              {o.text ? (
                <p className={`m-0 mb-4 text-[14px] leading-[1.6] ${green ? '' : 'text-muted'}`}>{o.text}</p>
              ) : null}
              {o.link?.label ? (
                <Link
                  href={o.link.url || '#'}
                  className={`inline-block rounded-[9px] px-[18px] py-[11px] text-[14px] no-underline ${
                    green ? 'bg-white font-bold text-brand-text' : 'border border-[#cfc9ba] font-semibold text-ink'
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
            <div className="mb-3 font-mono text-[14px] tracking-[.06em] text-muted">{location.eyebrow}</div>
            <div className="mb-1 font-display text-[20px] font-extrabold">{location.title}</div>
            {location.line ? <div className="mb-3.5 text-[15px] text-[#4c4a42]">{location.line}</div> : null}
            {location.transit ? (
              <div className="whitespace-pre-line font-mono text-[14px] leading-[1.8] text-muted">
                {location.transit}
              </div>
            ) : null}
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Standort in Google Maps öffnen — Kennedyallee 18, 53175 Bonn"
            className="group relative block aspect-[3/2] w-full overflow-hidden rounded-[14px] ring-1 ring-line ring-inset transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Media
              resource={location.map ?? FALLBACK_MAP}
              placeholder={location.mapPlaceholder ?? 'Karte'}
              className="h-full w-full"
              sizes="(max-width:640px) 100vw, 560px"
            />
            {/* Signet marker — only when using our stylised base map (an editor
                upload is a real photo/map that carries its own marker). Tip of the
                pin is anchored to MARKER_POS via translate(-50%,-100%). */}
            {!location.map ? (
              <span
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.28)]"
                style={{ left: MARKER_POS.left, top: MARKER_POS.top }}
                aria-hidden
              >
                <span className="block h-9 w-9 -rotate-45 rounded-[50%] rounded-bl-none bg-white ring-1 ring-black/10">
                  <span className="flex h-full w-full rotate-45 items-center justify-center">
                    {/* biome-ignore lint/performance/noImgElement: static inline SVG marker — next/image is overkill for an 18px decorative icon */}
                    <img src="/logo/signet-green.svg" alt="" className="h-[18px] w-[18px]" />
                  </span>
                </span>
              </span>
            ) : null}
            <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-white/90 px-3 py-1 font-mono text-[14px] font-semibold text-ink shadow-sm backdrop-blur-sm transition-transform group-hover:-translate-y-0.5">
              In Maps öffnen ↗
            </span>
          </a>
        </div>
      ) : null}
    </div>
  )
}
