import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono, Newsreader, Caveat } from 'next/font/google'
import '@/styles/globals.css'
import { getPayloadClient } from '@/lib/getPayload'

// self-hosted, Turbopack-safe fonts; each exposes a --font-* CSS var that the
// Tailwind config and globals.css reference.
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
  const payload = await getPayloadClient()
  const site = await payload.findGlobal({ slug: 'siteSettings' }).catch(() => null)

  return (
    <html lang="de" className={fontVars}>
      <body>
        <TopStrip status={site?.topStrip?.status ?? undefined} address={site?.topStrip?.address ?? undefined} />
        <Header nav={navFrom(site)} cta={ctaFrom(site)} />
        {children}
        <Footer links={footerLinksFrom(site)} />
      </body>
    </html>
  )
}
