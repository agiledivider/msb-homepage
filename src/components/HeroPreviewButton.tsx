'use client'

import { useDocumentInfo } from '@payloadcms/ui'

/**
 * Sidebar button on blog/event docs that opens the hero-carousel preview (how the
 * post/event looks in the homepage hero) in a new tab. Routes through
 * /next/preview so Draft Mode is on and the saved draft is shown.
 */
export function HeroPreviewButton() {
  const { collectionSlug, savedDocumentData } = useDocumentInfo()
  const slug = savedDocumentData?.slug as string | undefined

  if (!collectionSlug || !slug) return null // only once the doc has a slug (saved)

  const target = `/preview/hero?collection=${collectionSlug}&slug=${encodeURIComponent(slug)}`
  const href = `/next/preview?path=${encodeURIComponent(target)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="btn btn--style-secondary btn--size-small"
      style={{ margin: 0 }}
    >
      Hero-Vorschau ↗
    </a>
  )
}
