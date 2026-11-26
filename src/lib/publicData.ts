import { draftMode, headers } from 'next/headers'
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
 *   findPreview  privileged draft read for Next draft mode.
 *   isDraftRequest  draft-mode cookie AND a live CMS session. The cookie alone
 *                is not enough: it outlives logout (and the login it was set
 *                under), so a logged-out browser would keep seeing drafts.
 *   findForRequest  findPreview when isDraftRequest, findPublic otherwise.
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
  /** 1-based page of `limit` docs (blog paging, S5.10). */
  page?: number
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

/**
 * Should this request see drafts? Only with the draft-mode cookie *and* a valid
 * CMS login. Use this instead of `draftMode()` everywhere in the frontend
 * (tests/fitness/frontend-reads.test.ts enforces it).
 */
export async function isDraftRequest(): Promise<boolean> {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return false
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return Boolean(user)
}

/** findPreview for a logged-in draft-mode request, findPublic otherwise. */
export async function findForRequest<S extends PublicCollection>(args: PublicFindArgs<S>): Promise<Docs<S>> {
  return (await isDraftRequest()) ? findPreview(args) : findPublic(args)
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
