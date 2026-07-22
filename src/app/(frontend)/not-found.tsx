import Link from 'next/link'
import { PageIntroComponent } from '@/blocks/PageIntro/Component'

/**
 * 404 page. Also the source of `404.html` in the static bundle — the publish
 * step requests a deliberately missing path to capture it, and the host config
 * (nginx `error_page` / Apache `ErrorDocument`) serves it for unknown URLs.
 */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <PageIntroComponent
        blockType="pageIntro"
        tag="404"
        meta="Seite nicht gefunden"
        headline="Hier ist nichts"
        lede="Die Seite gibt es nicht (mehr). Vielleicht hilft einer dieser Wege weiter."
      />
      <div className="mt-8 flex flex-wrap gap-4 font-mono text-[13px]">
        <Link href="/" className="text-brand-text no-underline hover:underline">
          ← Startseite
        </Link>
        <Link href="/events" className="text-brand-text no-underline hover:underline">
          Events
        </Link>
        <Link href="/blog" className="text-brand-text no-underline hover:underline">
          Blog
        </Link>
      </div>
    </main>
  )
}
