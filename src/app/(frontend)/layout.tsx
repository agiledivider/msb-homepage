import { config } from '@fortawesome/fontawesome-svg-core'
import type { Metadata, Viewport } from 'next'
import { Archivo, Caveat, IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google'
import '@fortawesome/fontawesome-svg-core/styles.css'
import '@/styles/globals.css'

// We import Font Awesome's CSS above manually, so stop the core from injecting
// it again at runtime (which flashes oversized icons before hydration).
config.autoAddCss = false

import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { StatsBeacon } from '@/components/StatsBeacon'
import { getPayloadClient } from '@/lib/getPayload'
import { isDraftRequest } from '@/lib/publicData'
import { THEME_COLOR, THEME_INIT_SCRIPT } from '@/lib/theme'

// self-hosted, Turbopack-safe fonts; each exposes a --font-* CSS var that the
// Tailwind theme references. IBM Plex Sans is the MSB brand typeface for body/UI;
// Archivo (up to Black/900) is the display face for punchy headlines — IBM Plex
// Sans caps at Bold/700. Montserrat (logo) is baked into the logo images.
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
})
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' })

const fontVars = `${archivo.variable} ${plexSans.variable} ${plexMono.variable} ${newsreader.variable} ${caveat.variable}`

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { TopStrip } from '@/components/TopStrip'
import { ctaFrom, footerFrom, footerLinksFrom, navFrom } from '@/lib/mappers'

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SERVER_URL ? new URL(process.env.NEXT_PUBLIC_SERVER_URL) : undefined,
  title: {
    default: 'MakerSpace Bonn e.V. — Offene Werkstatt',
    template: '%s · MakerSpace Bonn',
  },
  description: 'Eine offene Werkstatt für Bonn. Für alle. Sechs Werkstätten, über 40 Maschinen.',
  // S1.7: files in public/ (pnpm icons), so the static bundle serves the same ones.
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { title: 'MakerSpace' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLOR.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOR.dark },
  ],
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const draft = await isDraftRequest()
  const payload = await getPayloadClient()
  const site = await payload.findGlobal({ slug: 'siteSettings', draft }).catch(() => null)

  return (
    // suppressHydrationWarning: the head script may set data-theme before React hydrates
    <html lang="de" className={fontVars} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own constant (lib/theme.ts), applies the stored light/dark pick before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="m-0 bg-paper font-sans text-ink [background-image:linear-gradient(var(--color-raster)_1px,transparent_1px),linear-gradient(90deg,var(--color-raster)_1px,transparent_1px)] [background-size:27px_27px]">
        {draft ? <RefreshRouteOnSave /> : null}
        <TopStrip status={site?.topStrip?.status ?? undefined} address={site?.topStrip?.address ?? undefined} />
        <Header nav={navFrom(site)} cta={ctaFrom(site)} search={process.env.STATIC_EXPORT !== 'true'} />
        {children}
        <Footer links={footerLinksFrom(site)} {...footerFrom(site)} />
        {/* S5.11: counts page views without cookies (D-012). Not in drafts/previews, and not in the
            static bundle, which has no app to count to (docs/STATIC.md checklist). */}
        {draft || process.env.STATIC_EXPORT === 'true' ? null : <StatsBeacon />}
      </body>
    </html>
  )
}
