import { withPayload } from '@payloadcms/next/withPayload'
import { DEVICE_SIZES, IMAGE_SIZES } from './src/lib/imageWidths.mjs'

/** Publishing the site as static files (see scripts/publish-static.ts). */
const STATIC_EXPORT = process.env.STATIC_EXPORT === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pin the workspace root — a stray ~/package-lock.json otherwise makes Next
  // infer the home directory as the root.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
  // allow testing the dev server from a physical device over the LAN — Next
  // otherwise treats the LAN-IP origin as cross-origin and blocks /_next/*
  // (HMR socket + JS chunks). Add your Mac's LAN IP / subnet here.
  allowedDevOrigins: ['192.168.178.46', '192.168.178.*', '192.168.10.*'],
  // The default bottom-left "N" badge sits exactly on Payload's logout icon at
  // the foot of the admin sidebar, which made logout look missing in dev.
  devIndicators: { position: 'bottom-right' },
  images: {
    // Pinned in both modes: these widths drive every `srcset` next/image emits,
    // and the static publish step pre-generates exactly one WebP per width.
    deviceSizes: DEVICE_SIZES,
    imageSizes: IMAGE_SIZES,
    localPatterns: [
      { pathname: '/api/media/file/**' },
      { pathname: '/media/**' },
      { pathname: '/diday/**' },
      { pathname: '/brand/**' },
    ],
    // Static hosts have no /_next/image optimizer, so point each srcset entry at
    // a pre-built file instead. NOTE: `loader` and `unoptimized` are mutually
    // exclusive — setting both makes Next ignore the loader and ship originals.
    ...(STATIC_EXPORT ? { loader: 'custom', loaderFile: './src/lib/staticImageLoader.ts' } : {}),
  },
}

export default withPayload(nextConfig)
