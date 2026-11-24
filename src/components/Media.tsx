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
      /** Payload focal point, percent of width / height (S5.7) */
      focalX?: number | null
      focalY?: number | null
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
  const objectPosition = resource && typeof resource === 'object' ? focalPosition(resource) : undefined

  return (
    // container-type lets the KI label scale with the image (cqw), not the viewport.
    <div className={`${className ?? ''} [container-type:inline-size]`} style={{ position: 'relative', ...style }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        style={objectPosition ? { objectPosition } : undefined}
        priority={priority}
      />
      {ai === 'generated' || ai === 'edited' ? <KiLabel kind={ai} /> : null}
    </div>
  )
}

const pct = (v: number) => `${Math.min(100, Math.max(0, v))}%`

/**
 * The editor's focal point as CSS `object-position`, so every `object-cover`
 * crop keeps that spot in view (S5.7). Without both coordinates the browser's
 * default centre crop stays, so untouched images look as before.
 */
function focalPosition(m: { focalX?: number | null; focalY?: number | null }): string | undefined {
  if (typeof m.focalX !== 'number' || typeof m.focalY !== 'number') return undefined
  if (!Number.isFinite(m.focalX) || !Number.isFinite(m.focalY)) return undefined
  return `${pct(m.focalX)} ${pct(m.focalY)}`
}

const KI_TEXT = { generated: 'Bild generiert', edited: 'Bild bearbeitet' } as const

/**
 * The styleguide's KI label strip (green "KI" + ink field), drawn over the
 * bottom-left corner of whatever crop is visible. It scales with the image
 * (cqw) and is deliberately smaller than the styleguide's 48 px on 1080 px
 * (Falk 2026-11-22: the label must not dominate list thumbnails). On small
 * images (< 240 px, e.g. list rows) only a tiny "KI" tag remains; the full
 * wording is in the aria-label.
 */
function KiLabel({ kind }: { kind: keyof typeof KI_TEXT }) {
  return (
    <div
      role="img"
      aria-label={`KI · ${KI_TEXT[kind]}`}
      className="pointer-events-none absolute bottom-[clamp(4px,2.5cqw,24px)] left-[clamp(4px,2.5cqw,24px)] flex h-[clamp(13px,3cqw,26px)] font-mono text-[clamp(8px,1.4cqw,12px)] font-medium uppercase leading-none tracking-[.06em]"
    >
      <span className="flex items-center bg-brand px-[.5em] text-tinte">KI</span>
      <span className="flex items-center bg-tinte px-[.6em] text-white @max-[240px]:hidden">{KI_TEXT[kind]}</span>
    </div>
  )
}
