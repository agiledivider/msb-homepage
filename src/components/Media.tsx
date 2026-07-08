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
  | { url?: string | null; alt?: string | null; width?: number | null; height?: number | null }
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
        <div className="flex h-full w-full items-center justify-center rounded-[6px] border border-dashed border-black/20 bg-black/[0.03] p-4 text-center font-mono text-xs text-muted">
          {placeholder ?? 'Bild'}
        </div>
      </div>
    )
  }

  const alt = (typeof resource === 'object' && resource?.alt) || placeholder || ''

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" priority={priority} />
    </div>
  )
}
