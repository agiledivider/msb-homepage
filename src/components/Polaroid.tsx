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
      className={`relative${rotate ? ' md:rotate-[var(--pl-rot)]' : ''}`}
      style={rotate ? ({ '--pl-rot': `${rotate}deg` } as CSSProperties) : undefined}
    >
      {/* The cream frame itself caps its width + centers on mobile (max-w on this
          block — reliable, unlike max-w on a flex item), so it hugs the 4:3 image
          and spare space shows the mat, not stretched cream. Tapes live inside the
          frame so they track it as it shrinks. */}
      <div className="relative mx-auto bg-cream px-[7px] pt-[7px] pb-6 shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)] max-md:w-full max-md:max-w-[calc((100svh_-_176px)_/_1.5_+_14px)] md:px-2.5 md:pt-2.5 md:pb-[42px]">
        <TapeStrip style={{ top: -13, left: 24, width: 78, height: 26, transform: 'rotate(-5deg)' }} />
        <TapeStrip style={{ bottom: -11, right: 30, width: 70, height: 24, transform: 'rotate(-4deg)' }} />
        <Media
          resource={image}
          placeholder={placeholder}
          className="block aspect-[4/3] w-full"
          sizes={sizes}
        />
        {caption ? (
          // Sits in the bottom white margin band (== the frame's pb) and centres
          // within it, so the line box never rides up over the photo on small frames.
          <div className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center px-2 text-center font-hand text-[15px] font-semibold leading-none text-[#3c4a42] md:h-[42px] md:text-[20px]">
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  )
}
