'use client'

import { useDocumentInfo } from '@payloadcms/ui'

/**
 * Button on blog/event docs and on the hero settings that opens the hero-carousel
 * preview (desktop plus common phone sizes) in a new tab. Routes through
 * /next/preview so Draft Mode is on and the saved draft is shown.
 */
export function HeroPreviewButton() {
  const { collectionSlug, globalSlug, savedDocumentData } = useDocumentInfo()
  const slug = savedDocumentData?.slug as string | undefined

  let target: string
  if (globalSlug === 'heroSettings') {
    target = '/preview/hero?collection=hero' // the first ("Werkstatt") face
  } else {
    if (!collectionSlug || !slug) return null // only once the doc has a slug (saved)
    target = `/preview/hero?collection=${collectionSlug}&slug=${encodeURIComponent(slug)}`
  }
  const href = `/next/preview?path=${encodeURIComponent(target)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="btn btn--style-secondary btn--size-small"
      style={{ margin: 0, whiteSpace: 'nowrap' }}
    >
      Hero-Vorschau ↗
    </a>
  )
}
