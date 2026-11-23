'use client'

import { PublishButton as PayloadPublishButton, useAuth, useDocumentInfo } from '@payloadcms/ui'

/**
 * The native publish button, labelled with what it does for this user (the
 * publish gate decides the outcome): an editor submits for review and nothing
 * goes live; a reviewer publishes immediately. Both save the form first.
 */
export function PublishButton() {
  const { user } = useAuth()
  const { data } = useDocumentInfo()
  const isReviewer = Boolean((user as { canReview?: boolean } | undefined)?.canReview)
  const inReview = data?.reviewStatus === 'in_review'

  const label = isReviewer
    ? inReview
      ? 'Freigeben & veröffentlichen'
      : 'Veröffentlichen'
    : inReview
      ? 'Erneut zur Prüfung einreichen'
      : 'Zur Prüfung einreichen'
  return <PayloadPublishButton label={label} />
}
