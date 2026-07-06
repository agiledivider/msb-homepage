import type { Metadata } from 'next'
import '@/styles/globals.css'
import { getPayloadClient } from '@/lib/getPayload'
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
    <html lang="de">
      <body>
        <TopStrip status={site?.topStrip?.status ?? undefined} address={site?.topStrip?.address ?? undefined} />
        <Header nav={navFrom(site)} cta={ctaFrom(site)} />
        {children}
        <Footer links={footerLinksFrom(site)} />
      </body>
    </html>
  )
}
