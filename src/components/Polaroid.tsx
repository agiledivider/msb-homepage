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
 * bottom margin, and an optional tilt. All styling (including the hero's mobile
 * fit) lives here as Tailwind classes.
 *
 * `fitMobile` applies the hero's below-900px behaviour: reset the tilt, order the
 * photo above the text in the stacked layout, shrink the frame padding and give
 * the image a responsive height. Standalone polaroids leave it off and keep their
 * base look on every screen.
 */
export function Polaroid({
  image,
  placeholder = 'Foto',
  caption,
  rotate,
  className,
  imageClassName,
  sizes = '100vw',
  fitMobile = false,
}: {
  image?: MediaResource
  placeholder?: string
  caption?: string | null
  /** tilt in degrees */
  rotate?: number
  className?: string
  imageClassName?: string
  sizes?: string
  /** apply the hero's mobile fit (reset tilt, shrink frame, responsive height) below 900px */
  fitMobile?: boolean
}) {
  const rootFit = fitMobile
    ? ' max-[900px]:order-1 max-[900px]:mx-auto max-[900px]:w-full max-[900px]:flex-none max-[900px]:!transform-none'
    : ''
  const frameFit = fitMobile ? ' max-[900px]:!px-[7px] max-[900px]:!pt-[7px] max-[900px]:!pb-6' : ''
  const imgFit = fitMobile ? ' max-[900px]:!h-[42vw]' : ''
  const captionFit = fitMobile ? ' max-[900px]:!text-[15px]' : ''

  return (
    <div
      className={`relative${className ? ` ${className}` : ''}${rootFit}`}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <TapeStrip style={{ top: -13, left: 24, width: 78, height: 26, transform: 'rotate(-5deg)' }} />
      <TapeStrip style={{ bottom: -11, right: 30, width: 70, height: 24, transform: 'rotate(-4deg)' }} />
      <div className={`relative bg-cream p-2.5 pb-[42px] shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)]${frameFit}`}>
        <Media
          resource={image}
          placeholder={placeholder}
          className={`block h-[320px] w-full${imgFit}${imageClassName ? ` ${imageClassName}` : ''}`}
          sizes={sizes}
        />
        {caption ? (
          <div
            className={`absolute inset-x-0 bottom-3 text-center font-hand text-[20px] font-semibold text-[#3c4a42]${captionFit}`}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  )
}
