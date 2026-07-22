import type { CollectionAfterChangeHook } from 'payload'
import { publisherToken, publisherUrl } from '../types'

/**
 * Queue a site rebuild when published content changes.
 *
 * Only fires for documents that are published now or were published before
 * (so an unpublish also rebuilds) — saving a draft must not spend a build.
 * The request is debounced by the publisher, so a burst of edits collapses
 * into one run, and it is fire-and-forget: a publisher that is down or slow
 * must never make saving a document fail.
 */
export const makeAutoPublishHook = (): CollectionAfterChangeHook =>
  async function queueSitePublish({ doc, previousDoc, collection, req }) {
    const base = publisherUrl()
    if (!base) return doc

    const isPublished = doc?._status === 'published'
    const wasPublished = previousDoc?._status === 'published'
    if (!isPublished && !wasPublished) return doc

    const verb = isPublished ? (wasPublished ? 'updated' : 'published') : 'unpublished'
    const reason = `${collection.slug} ${verb}: ${doc?.slug ?? doc?.id}`

    void fetch(`${base}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Publish-Token': publisherToken() },
      body: JSON.stringify({ reason, debounce: true }),
      signal: AbortSignal.timeout(5_000),
    }).catch((err) => {
      req.payload.logger.warn(`auto-publish request failed (content was still saved): ${err}`)
    })

    return doc
  }
