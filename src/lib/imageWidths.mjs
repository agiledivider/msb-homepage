/**
 * The one source of truth for the responsive image width ladder.
 *
 * `next.config.mjs` feeds these to next/image (which uses them to build every
 * `srcset`), and `scripts/publish-static.ts` pre-generates exactly one WebP per
 * width per image. If the two ever disagree, `srcset` entries 404 — hence a
 * single shared module rather than two copies of the same array.
 *
 * Plain `.mjs` so both the Next config (ESM, no TS pipeline) and the publish
 * script can import it.
 */

/** Widths next/image considers for full-width (`sizes`-driven) images. */
export const DEVICE_SIZES = [640, 768, 1080, 1200, 1920]

/** Widths for small fixed-size images. Must all be below the smallest device size. */
export const IMAGE_SIZES = [256, 384]

/** Every width the static ladder must contain, ascending. */
export const ALL_WIDTHS = [...IMAGE_SIZES, ...DEVICE_SIZES].sort((a, b) => a - b)
