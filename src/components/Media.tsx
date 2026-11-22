import Image from 'next/image'
import type { CSSProperties } from 'react'

/**
 * Minimal media renderer for Payload upload fields.
 *
 * `resource` is whatever a Payload `upload` field returns: a populated media
 * doc ({ url, alt, width, height }) or an id string when unpopulated. When
 * there's no usable image we fall back to the design's dashed placeholder so
 * editors see the same "empty slot" the original `image-slot` showed.
 */
export type MediaResource =
  | {
      url?: string | null
      alt?: string | null
      width?: number | null
      height?: number | null
      aiLabel?: 'none' | 'generated' | 'edited' | null
    }
  | string
  | null
  | undefined

export function Media({
  resource,
  placeholder,
  className,
  style,
  sizes = '100vw',
  priority = false,
}: {
  resource: MediaResource
  placeholder?: string
  className?: string
  style?: CSSProperties
  sizes?: string
  /** eager-load + preload (e.g. the active hero face, which 3D-transforms confuse lazy loading on) */
  priority?: boolean
}) {
  const src = resource && typeof resource === 'object' ? resource.url : undefined

  if (!src) {
    return (
      <div
        className={className}
        style={style}
        aria-hidden
        // dashed placeholder mirrors the standalone design's empty image-slot
      >
        <div className="flex h-full w-full items-center justify-center rounded-[6px] border border-dashed border-black/20 bg-black/[0.03] p-4 text-center font-mono text-sm text-muted">
          {placeholder ?? 'Bild'}
        </div>
      </div>
    )
  }

  const alt = (typeof resource === 'object' && resource?.alt) || placeholder || ''
  const ai = typeof resource === 'object' ? resource?.aiLabel : undefined

  return (
    // container-type lets the KI label scale with the image (cqw), not the viewport.
    <div className={`${className ?? ''} [container-type:inline-size]`} style={{ position: 'relative', ...style }}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" priority={priority} />
      {ai === 'generated' || ai === 'edited' ? <KiLabel kind={ai} /> : null}
    </div>
  )
}

const KI_TEXT = { generated: 'Bild generiert', edited: 'Bild bearbeitet' } as const

/**
 * The styleguide's KI label strip (green "KI" + ink field), drawn over the
 * bottom-left corner of whatever crop is visible. Styleguide size: 48 px tall
 * and 72 px from the edge on a 1080 px image, i.e. ~4.4 % and ~6.7 % of the
 * width; clamped to the site's 14 px text minimum on small images.
 */
function KiLabel({ kind }: { kind: keyof typeof KI_TEXT }) {
  return (
    <div className="pointer-events-none absolute bottom-[clamp(8px,4cqw,40px)] left-[clamp(8px,4cqw,40px)] flex h-[clamp(26px,4.4cqw,36px)] font-mono text-[clamp(14px,2cqw,16px)] font-medium uppercase leading-none tracking-[.06em]">
      <span className="flex items-center bg-brand px-[.6em] text-ink">KI</span>
      <span className="flex items-center bg-ink px-[.7em] text-white">{KI_TEXT[kind]}</span>
    </div>
  )
}
