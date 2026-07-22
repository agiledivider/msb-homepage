/**
 * next/image loader for the fully static build (`STATIC_EXPORT=true`).
 *
 * A static host has no `/_next/image` optimizer, so instead of resizing on
 * demand we pre-generate a WebP per width at publish time
 * (`scripts/publish-static.ts` → `generateImageLadder`) and simply point each
 * `srcset` entry at the matching file:
 *
 *   /media/hero-blog.jpg  +  width 768  →  /media/hero-blog@768.webp
 *
 * The ladder generator writes a file for *every* width in `imageWidths.mjs`
 * even when the original is smaller (it clamps instead of upscaling), so every
 * name this function can produce is guaranteed to exist. That is what lets the
 * loader stay a pure string function with no manifest to look anything up in.
 *
 * Runs in the browser bundle too — keep it dependency-free and synchronous.
 */
export default function staticImageLoader({ src, width }: { src: string; width: number }): string {
  // Payload appends a cache tag (`?<updatedAt>`) to upload URLs. Static file
  // servers ignore the query when matching, so we keep it for cache busting but
  // must not let it end up in the middle of the filename.
  const q = src.indexOf('?')
  const base = q === -1 ? src : src.slice(0, q)
  const query = q === -1 ? '' : src.slice(q)

  // Only raster formats get a ladder; SVG/GIF/PDF are served as-is.
  if (!/\.(jpe?g|png|webp)$/i.test(base)) return src

  const dot = base.lastIndexOf('.')
  return `${base.slice(0, dot)}@${width}.webp${query}`
}
