import { Media, type MediaResource } from './Media'

/** Stylised brand map used when no map image is uploaded in the CMS; an
 *  editor-uploaded map still overrides it. Lives in /public/brand, which is
 *  committed and ships in the image. Not /public/media: that is the Payload
 *  upload dir (gitignored, a volume in production), so a file there only exists
 *  on the machine that put it there. */
const FALLBACK_MAP: MediaResource = {
  url: '/brand/karte-kennedyallee.webp',
  alt: 'Karte: MakerSpace Bonn, Kennedyallee 18, 53175 Bonn',
  width: 1400,
  height: 939,
  aiLabel: 'edited', // the old OSM screenshot recoloured with an AI image editor
}
/** The MakerSpace's own OpenStreetMap entry ("Makerspace Bonn", Kennedyallee 18;
 *  checked via Nominatim 2026-11-22). The main map link: open data, no tracking. */
const OSM_URL = 'https://www.openstreetmap.org/node/5454350635'
const GOOGLE_MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=MakerSpace Bonn,+53175+Bonn'
/** Where the MakerSpace sits on the stylised base map (percent of the image).
 *  Kennedyallee 18 (50.69817, 7.14513) is on the SW side of Kennedyallee, just
 *  west of the Burgfriedhof green — i.e. upper-right, on the road left of the
 *  big green block. Matches the red pin in the source screenshot (~68%/22%). */
const MARKER_POS = { left: '63%', top: '23%' }

// Brand logos from Simple Icons 13.21.0 (CC0-1.0). Font Awesome has neither.
const OSM_LOGO =
  'M2.672 23.969c-.352-.089-.534-.234-1.471-1.168C.085 21.688.014 21.579.018 20.999c0-.645-.196-.414 3.368-3.986 3.6-3.608 3.415-3.451 4.064-3.449.302 0 .378.016.62.14l.277.14 1.744-1.744-.218-.343c-.425-.662-.825-1.629-1.006-2.429a7.657 7.657 0 0 1 1.479-6.44c2.49-3.12 6.959-3.812 10.26-1.588 1.812 1.218 2.99 3.099 3.328 5.314.07.467.07 1.579 0 2.074a7.554 7.554 0 0 1-2.205 4.402 6.712 6.712 0 0 1-1.943 1.401c-.959.483-1.775.71-2.881.803-1.573.131-3.32-.305-4.656-1.163l-.343-.218-1.744 1.744.14.28c.125.241.14.316.14.617.003.651.156.467-3.426 4.049-2.761 2.756-3.186 3.164-3.398 3.261-.271.125-.69.171-.945.106zM17.485 13.95a6.425 6.425 0 0 0 4.603-3.51c1.391-2.899.455-6.306-2.227-8.108-.638-.43-1.529-.794-2.367-.962-.581-.117-1.809-.104-2.414.025a6.593 6.593 0 0 0-2.452 1.064c-.444.315-1.177 1.048-1.487 1.487a6.384 6.384 0 0 0 .38 7.907 6.406 6.406 0 0 0 3.901 2.136c.509.078 1.542.058 2.065-.037zm-3.738 7.376a80.97 80.97 0 0 1-2.196-.651c-.025-.028 1.207-4.396 1.257-4.449.023-.026 4.242 1.152 4.414 1.236.062.026-.003.288-.525 2.102a398.513 398.513 0 0 0-.635 2.236c-.025.087-.069.156-.097.156-.028-.003-1.028-.287-2.219-.631zm2.912.524c0-.053 1.227-4.333 1.246-4.347.047-.034 4.324-1.23 4.341-1.211.019.019-1.199 4.337-1.23 4.36-.02.019-4.126 1.191-4.259 1.218-.054.011-.098 0-.098-.019zm-7.105-1.911c.846-.852 1.599-1.627 1.674-1.728.171-.218.405-.732.472-1.015.026-.118.053-.352.058-.522l.011-.307.182-.051c.103-.028.193-.044.202-.034.023.025-1.207 4.321-1.246 4.36-.02.016-.677.213-1.464.436l-1.425.405 1.537-1.542zm8.289-3.06a1.371 1.371 0 0 1-.059-.187l-.044-.156.156-.028c1.339-.227 2.776-.856 3.908-1.713.16-.125.252-.171.265-.134.054.165.272.95.265.959-.034.034-4.48 1.282-4.492 1.261zm-15.083-1.3c-.05-.039-1.179-3.866-1.264-4.29-.016-.084.146-.044 2.174.536 2.121.604 2.192.629 2.222.74.028.098.011.129-.125.223-.084.059-.769.724-1.523 1.479a63.877 63.877 0 0 1-1.39 1.367c-.016 0-.056-.025-.093-.054zm.821-4.378c-1.188-.343-2.164-.623-2.167-.626-.016-.012 1.261-4.433 1.285-4.46.022-.022 4.422 1.211 4.469 1.252.009.009-.269 1.017-.618 2.239-.576 2.02-.643 2.224-.723 2.22-.05-.003-1.059-.285-2.247-.626zm2.959.538c.012-.031.212-.723.444-1.534l.42-1.476.056.321c.093.556.265 1.188.464 1.741.106.296.187.539.181.545-.008.006-.332.101-.719.212-.389.109-.741.21-.786.224-.058.016-.075.006-.059-.034zM4.905 6.112c-1.187-.339-2.167-.635-2.18-.654-.04-.062-1.246-4.321-1.23-4.338.026-.025 4.31 1.204 4.351 1.246.047.051 1.28 4.379 1.246 4.376L4.91 6.113zm2.148-1.713l-.519-1.806-.078-.28 1.693-.483c.934-.265 1.724-.495 1.76-.508.034-.016-.083.14-.26.336A8.729 8.729 0 0 0 7.69 5.23a4.348 4.348 0 0 0-.132.561c0 .293-.115-.025-.505-1.39z'
const GOOGLE_MAPS_LOGO =
  'M19.527 4.799c1.212 2.608.937 5.678-.405 8.173-1.101 2.047-2.744 3.74-4.098 5.614-.619.858-1.244 1.75-1.669 2.727-.141.325-.263.658-.383.992-.121.333-.224.673-.34 1.008-.109.314-.236.684-.627.687h-.007c-.466-.001-.579-.53-.695-.887-.284-.874-.581-1.713-1.019-2.525-.51-.944-1.145-1.817-1.79-2.671L19.527 4.799zM8.545 7.705l-3.959 4.707c.724 1.54 1.821 2.863 2.871 4.18.247.31.494.622.737.936l4.984-5.925-.029.01c-1.741.601-3.691-.291-4.392-1.987a3.377 3.377 0 0 1-.209-.716c-.063-.437-.077-.761-.004-1.198l.001-.007zM5.492 3.149l-.003.004c-1.947 2.466-2.281 5.88-1.117 8.77l4.785-5.689-.058-.05-3.607-3.035zM14.661.436l-3.838 4.563a.295.295 0 0 1 .027-.01c1.6-.551 3.403.15 4.22 1.626.176.319.323.683.377 1.045.068.446.085.773.012 1.22l-.003.016 3.836-4.561A8.382 8.382 0 0 0 14.67.439l-.009-.003zM9.466 5.868L14.162.285l-.047-.012A8.31 8.31 0 0 0 11.986 0a8.439 8.439 0 0 0-6.169 2.766l-.016.018 3.665 3.084z'

function Logo({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

/** Light pills on the map: hover is the shared secondary-button shift (green
 *  border on Grüner Fond); focus is the global ring, forced to Grün 600 so it
 *  reads on the light map even inside the dark footer. 44px tall targets. */
const TEXT_BADGE =
  'inline-flex min-h-11 items-center rounded-full bg-card px-3 font-mono text-[14px] font-semibold text-ink no-underline shadow-sm ring-1 ring-line transition-colors hover:bg-green-pale hover:text-brand-text hover:ring-brand-text focus-visible:outline-brand-text'
/** Footer variant: Grün 800 discs with Kreide logos, the footer's own colours,
 *  so the buttons read as part of the footer sitting on the map, not as stray
 *  third-party badges. Hover/focus flip to Markengrün with ink (styleguide:
 *  text on Markengrün is ink). */
const ICON_BADGE =
  'flex h-11 w-11 items-center justify-center rounded-full bg-green-deep text-kreide shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-colors hover:bg-brand hover:text-tinte focus-visible:bg-brand focus-visible:text-tinte focus-visible:outline-green-deep'

/**
 * The location map card. A click anywhere on the map opens OpenStreetMap; a
 * second link opens Google Maps. `links="text"` shows labelled pills, `"icons"`
 * shows the two brand logos (44px targets) for tight spots like the footer.
 *
 * Image, marker and link row share one grid cell. The OSM link's ::after
 * stretches over the whole card (its nearest positioned ancestor), so there is
 * one link per target for keyboard and screen readers.
 */
export function MapCard({
  map,
  placeholder,
  links = 'text',
  sizes = '(max-width:640px) 100vw, 560px',
  className = '',
}: {
  map?: MediaResource | null
  placeholder?: string | null
  links?: 'text' | 'icons'
  sizes?: string
  className?: string
}) {
  const icons = links === 'icons'
  return (
    // `isolate`: the link row's z-index stays inside the card. Without it the row
    // (z-20) ties with the sticky header (z-20) and, later in the page, wins in
    // WebKit: on an iPhone a tap on the header's search button opened the map (S5.23).
    <div
      data-location-map
      className={`relative isolate grid aspect-[3/2] w-full overflow-hidden rounded-[14px] ring-1 ring-line ring-inset transition-shadow hover:shadow-md ${className}`}
    >
      <Media
        resource={map ?? FALLBACK_MAP}
        placeholder={placeholder ?? 'Karte'}
        className="h-full w-full [grid-area:1/1]"
        sizes={sizes}
      />
      {/* Signet marker — only on our stylised base map (an editor upload carries
          its own marker). The pin's tip is anchored to MARKER_POS. */}
      {!map ? (
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
      {/* Not positioned itself, so the OSM link's ::after reaches the card. */}
      <div className="z-20 m-2.5 flex flex-wrap justify-end gap-2 self-end justify-self-end [grid-area:1/1]">
        <a
          href={OSM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Standort in OpenStreetMap öffnen — Kennedyallee 18, 53175 Bonn"
          title={icons ? 'OpenStreetMap' : undefined}
          className={`${icons ? ICON_BADGE : TEXT_BADGE} after:absolute after:inset-0 after:content-['']`}
        >
          {icons ? <Logo d={OSM_LOGO} /> : 'OpenStreetMap ↗'}
        </a>
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Standort in Google Maps öffnen — Kennedyallee 18, 53175 Bonn"
          title={icons ? 'Google Maps' : undefined}
          className={`${icons ? ICON_BADGE : TEXT_BADGE} relative z-10`}
        >
          {icons ? <Logo d={GOOGLE_MAPS_LOGO} /> : 'Google Maps ↗'}
        </a>
      </div>
    </div>
  )
}
