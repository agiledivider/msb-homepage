import type { CSSProperties } from 'react'
import { Media, type MediaResource } from './Media'

/** A strip of "tape" holding a corner of the photo. */
function TapeStrip({ style }: { style: CSSProperties }) {
  return (
    <div
      className="absolute z-[3] bg-[rgba(251,247,236,.72)] shadow-[0_2px_6px_-3px_rgba(0,0,0,.3)]"
      style={style}
    />
  )
}

/**
 * A taped polaroid: a cream photo frame with two corner tapes, a caption in the
 * bottom margin, and an optional tilt.
 *
 * Mobile-first and responsive: below the `md` breakpoint (768px) it sits flat
 * with a compact frame and a viewport-relative image height; from `md` up it
 * gains the tilt, a roomier frame and a fixed image height. Pass `rotate` for the
 * desktop tilt; width/placement are left to the parent (e.g. the hero grid).
 */
export function Polaroid({
  image,
  placeholder = 'Foto',
  caption,
  rotate,
  sizes = '100vw',
}: {
  image?: MediaResource
  placeholder?: string
  caption?: string | null
  /** tilt in degrees, applied from the md breakpoint (768px) up (flat on mobile) */
  rotate?: number
  sizes?: string
}) {
  return (
    <div
      className={`relative max-md:mx-auto max-md:w-fit${rotate ? ' md:rotate-[var(--pl-rot)]' : ''}`}
      style={rotate ? ({ '--pl-rot': `${rotate}deg` } as CSSProperties) : undefined}
    >
      <TapeStrip style={{ top: -13, left: 24, width: 78, height: 26, transform: 'rotate(-5deg)' }} />
      <TapeStrip style={{ bottom: -11, right: 30, width: 70, height: 24, transform: 'rotate(-4deg)' }} />
      <div className="relative bg-cream px-[7px] pt-[7px] pb-6 shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)] max-md:mx-auto max-md:w-fit md:px-2.5 md:pt-2.5 md:pb-[42px]">
        {/* image is a fixed 4:3; on mobile its width is capped so height stays ≤ half
            the mat (leaving mat space on the sides rather than stretching it) */}
        <Media
          resource={image}
          placeholder={placeholder}
          className="block aspect-[4/3] w-[min(calc(100vw_-_110px),calc((100svh_-_176px)*2/3))] md:w-full"
          sizes={sizes}
        />
        {caption ? (
          <div className="absolute inset-x-0 bottom-3 text-center font-hand text-[15px] font-semibold text-[#3c4a42] md:text-[20px]">
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  )
}
