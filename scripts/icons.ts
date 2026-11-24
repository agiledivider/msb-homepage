/**
 * icons.ts — render the site and CMS icons from the signet (S1.7).
 *
 *   pnpm icons            write public/favicon.ico, public/icons/*, public/manifest.webmanifest
 *   pnpm icons --check    exit 1 if a file is missing or differs (tests/fitness/icons.test.ts)
 *
 * Everything lives in public/ so the static bundle (publish:static) serves
 * the same files; the site layout links them, the CMS gets its own tile.
 * Source: public/logo/signet-green.svg. Colours are the palette's
 * (globals.css): Markengrün signet, Papier background, Tannennacht tile.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const PAPER = '#fbf8f2' // --color-paper (light)
const TANNENNACHT = '#0c1511' // --color-paper (dark) / theme-color dark

/** The signet's drawing (everything inside its root <svg>), in its own 40.25 × 45.58 box. */
const signetInner = () => {
  const svg = readFileSync(path.join(PUBLIC, 'logo/signet-green.svg'), 'utf8')
  const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1]
  if (!inner) throw new Error('signet-green.svg: no <svg> content')
  return inner.trim()
}
const W = 40.251678
const H = 45.576923

/**
 * The signet centred in a square of side `size`, filling `fill` of it (height),
 * on an optional background (rounded by `radius`, share of the side).
 */
export function squareSvg({ fill, background, radius = 0 }: { fill: number; background?: string; radius?: number }) {
  const side = H / fill
  const x = (side - W) / 2
  const y = (side - H) / 2
  const r = (radius * side).toFixed(3)
  const bg = background ? `<rect width="${side}" height="${side}" rx="${r}" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side.toFixed(4)} ${side.toFixed(4)}"><title>MakerSpace Bonn</title>${bg}<g transform="translate(${x.toFixed(4)},${y.toFixed(4)})">${signetInner()}</g></svg>\n`
}

const png = (svg: string, size: number) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 48) * 4 })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()

/** ICO container holding PNG images (supported by every current browser). */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt8(0, e + 2) // palette
    header.writeUInt8(0, e + 3) // reserved
    header.writeUInt16LE(1, e + 4) // colour planes
    header.writeUInt16LE(32, e + 6) // bits per pixel
    header.writeUInt32LE(data.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map((im) => im.data)])
}

export const MANIFEST = {
  name: 'MakerSpace Bonn',
  short_name: 'MakerSpace',
  description: 'Eine offene Werkstatt für Bonn. Für alle.',
  lang: 'de',
  start_url: '/',
  display: 'browser',
  background_color: PAPER,
  theme_color: PAPER,
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

/** Every generated file: published path → contents. */
export async function renderIcons(): Promise<Record<string, Buffer>> {
  // Tabs: the bare signet, Markengrün reads on light and dark tab bars alike.
  const tab = squareSvg({ fill: 0.96 })
  // Home screens and app lists: no transparency there, so Papier behind it.
  const tile = squareSvg({ fill: 0.7, background: PAPER })
  // Android may crop to a circle: keep the signet inside the 80 % safe zone.
  const maskable = squareSvg({ fill: 0.52, background: PAPER })
  // The CMS: signet on a Tannennacht tile, so its tab differs from the site's.
  const admin = squareSvg({ fill: 0.72, background: TANNENNACHT, radius: 0.22 })

  return {
    'icons/icon.svg': Buffer.from(tab),
    'favicon.ico': ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(tab, size) })))),
    'icons/apple-touch-icon.png': await png(tile, 180),
    'icons/icon-192.png': await png(tile, 192),
    'icons/icon-512.png': await png(tile, 512),
    'icons/icon-maskable-512.png': await png(maskable, 512),
    'icons/admin-icon.svg': Buffer.from(admin),
    'icons/admin-icon-32.png': await png(admin, 32),
    'manifest.webmanifest': Buffer.from(`${JSON.stringify(MANIFEST, null, 2)}\n`),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = await renderIcons()
  const check = process.argv.includes('--check')
  const stale: string[] = []
  for (const [rel, data] of Object.entries(files)) {
    const file = path.join(PUBLIC, rel)
    let current: Buffer | null = null
    try {
      current = readFileSync(file)
    } catch {}
    if (current?.equals(data)) continue
    if (check) stale.push(rel)
    else writeFileSync(file, data)
  }
  if (check && stale.length) {
    console.error(`icons out of date: ${stale.join(', ')} (run pnpm icons)`)
    process.exit(1)
  }
  if (!check) console.log(`public/: ${Object.keys(files).length} icon files up to date`)
}
