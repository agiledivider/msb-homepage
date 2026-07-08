import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono, Newsreader, Caveat } from 'next/font/google'
import '@/styles/globals.css'
import { getPayloadClient } from '@/lib/getPayload'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'

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
import { TopStrip } from '@/components/TopStrip'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { navFrom, ctaFrom, footerLinksFrom } from '@/lib/mappers'

export const metadata: Metadata = {
  title: 'MakerSpace Bonn e.V. — Offene Werkstatt',
  description: 'Eine offene Werkstatt für Bonn. Für alle. Sechs Werkstätten, über 40 Maschinen.',
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayloadClient()
  const site = await payload.findGlobal({ slug: 'siteSettings', draft }).catch(() => null)

  return (
    <html lang="de" className={fontVars}>
      <body className="m-0 bg-paper font-sans text-ink [background-image:linear-gradient(rgba(94,177,48,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(94,177,48,.1)_1px,transparent_1px)] [background-size:27px_27px]">
        {draft ? <RefreshRouteOnSave /> : null}
        <TopStrip status={site?.topStrip?.status ?? undefined} address={site?.topStrip?.address ?? undefined} />
        <Header nav={navFrom(site)} cta={ctaFrom(site)} />
        {children}
        <Footer links={footerLinksFrom(site)} />
      </body>
    </html>
  )
}
