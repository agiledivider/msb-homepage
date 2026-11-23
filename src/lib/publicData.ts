import { draftMode } from 'next/headers'
import type { DataFromCollectionSlug, PaginatedDocs, Sort, Where } from 'payload'
import { getPayloadClient } from '@/lib/getPayload'
import { verifyPreviewToken } from '@/lib/previewToken'

/**
 * The single read path from the public frontend into editorial collections.
 *
 * Every frontend read of blog / events / pages goes through here (a fitness test
 * in tests/fitness enforces it), so "what may an anonymous visitor see" is
 * decided in one place:
 *
 *   findPublic   published AND editorially approved, under the collection's own
 *                access control (`overrideAccess: false`, no user). Use this for
 *                page bodies, generateMetadata, listings, feeds, sitemaps.
 *   findPreview  privileged draft read for Next draft mode. Draft mode is only
 *                enabled by /next/preview after it has verified a logged-in
 *                Payload user, so this never runs for anonymous visitors.
 *   findForRequest  picks one of the two from the request's draft-mode cookie.
 *   findByPreviewToken  privileged read of the one draft a signed preview link
 *                names (Claude has no CMS session); no draft mode involved.
 *
 * Without this, a plain `payload.find` runs with `overrideAccess: true` and
 * returns drafts — which then leak into `<head>` via generateMetadata even
 * when the page body itself 404s.
 */

export type PublicCollection = 'blog' | 'events' | 'pages' | 'workshops'

export type PublicFindArgs<S extends PublicCollection> = {
  collection: S
  where?: Where
  sort?: Sort
  limit?: number
  depth?: number
}

type Docs<S extends PublicCollection> = PaginatedDocs<DataFromCollectionSlug<S>>

/** Live = published and approved by a reviewer. */
export const PUBLIC_WHERE: Where = {
  and: [{ _status: { equals: 'published' } }, { reviewStatus: { equals: 'approved' } }],
}

export async function findPublic<S extends PublicCollection>({ where, ...args }: PublicFindArgs<S>): Promise<Docs<S>> {
  const payload = await getPayloadClient()
  return payload.find({
    ...args,
    where: where ? { and: [PUBLIC_WHERE, where] } : PUBLIC_WHERE,
    draft: false,
    overrideAccess: false,
  })
}

/** Privileged: drafts included. Only for Next draft mode (see module comment). */
export async function findPreview<S extends PublicCollection>(args: PublicFindArgs<S>): Promise<Docs<S>> {
  const payload = await getPayloadClient()
  return payload.find({ ...args, draft: true, overrideAccess: true })
}

/** findPreview in draft mode, findPublic otherwise. */
export async function findForRequest<S extends PublicCollection>(args: PublicFindArgs<S>): Promise<Docs<S>> {
  const { isEnabled } = await draftMode()
  return isEnabled ? findPreview(args) : findPublic(args)
}

/** One doc by slug (draft-mode aware), or undefined when it isn't visible to this request. */
export async function findBySlug<S extends PublicCollection>(
  collection: S,
  slug: string,
  depth = 1,
): Promise<DataFromCollectionSlug<S> | undefined> {
  const res = await findForRequest({ collection, where: { slug: { equals: slug } }, limit: 1, depth })
  return res.docs[0]
}

export type TokenPreview =
  | { collection: 'blog'; doc: DataFromCollectionSlug<'blog'> }
  | { collection: 'events'; doc: DataFromCollectionSlug<'events'> }

/**
 * Privileged: the latest draft of exactly the one document a signed preview link
 * names (see lib/previewToken.ts), or undefined for a bad or expired token.
 * Never enables draft mode, so every other read on the page stays public.
 */
export async function findByPreviewToken(token: string, now: Date, depth = 2): Promise<TokenPreview | undefined> {
  const payload = await getPayloadClient()
  const target = verifyPreviewToken(token, payload.secret, now)
  if (!target) return undefined
  const byId = { id: target.id, draft: true, depth, overrideAccess: true } as const
  try {
    switch (target.collection) {
      case 'blog':
        return { collection: 'blog', doc: await payload.findByID({ collection: 'blog', ...byId }) }
      case 'events':
        return { collection: 'events', doc: await payload.findByID({ collection: 'events', ...byId }) }
      default:
        return target.collection satisfies never
    }
  } catch {
    return undefined // deleted since the link was made
  }
}
