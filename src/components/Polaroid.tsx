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
 * bottom margin, and an optional tilt. Renders the `msb-photo-*` classes so the
 * hero's mobile-fit CSS (scoped under `.msb-face__photo`) still applies; used
 * standalone elsewhere, those rules simply don't match and it keeps its base size.
 */
export function Polaroid({
  image,
  placeholder = 'Foto',
  caption,
  rotate,
  className,
  imageClassName,
  sizes = '100vw',
}: {
  image?: MediaResource
  placeholder?: string
  caption?: string | null
  /** tilt in degrees (overridden to none on mobile inside the hero) */
  rotate?: number
  /** applied to the outer wrapper — the hero passes `msb-face__photo` */
  className?: string
  imageClassName?: string
  sizes?: string
}) {
  return (
    <div
      className={`relative${className ? ` ${className}` : ''}`}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <TapeStrip style={{ top: -13, left: 24, width: 78, height: 26, transform: 'rotate(-5deg)' }} />
      <TapeStrip style={{ bottom: -11, right: 30, width: 70, height: 24, transform: 'rotate(-4deg)' }} />
      <div className="msb-photo-frame relative bg-cream p-2.5 pb-[42px] shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)]">
        <Media
          resource={image}
          placeholder={placeholder}
          className={`msb-photo-img block h-[320px] w-full${imageClassName ? ` ${imageClassName}` : ''}`}
          sizes={sizes}
        />
        {caption ? (
          <div className="msb-photo-caption absolute inset-x-0 bottom-3 text-center font-hand text-[20px] font-semibold text-[#3c4a42]">
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  )
}
