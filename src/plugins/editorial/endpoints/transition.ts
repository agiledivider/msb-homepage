import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload'
import { isCmsUser } from '@/access/admin'
import { isReviewer } from '../access'
import { EDITORIAL_SKIP } from '../types'

type Body = { collection?: string; id?: string | number; action?: string; note?: string }

/**
 * Does the requesting user have update access to this doc under the collection's
 * own access control (RBAC)? Used to gate `submit` — the write itself runs with
 * `overrideAccess` (to bypass the publish gate + review-field locks), so without
 * this check *any* authenticated user could push *any* doc into review.
 */
async function canUpdate(req: PayloadRequest, slug: CollectionSlug, id: string | number): Promise<boolean> {
  const accessFn = req.payload.collections[slug]?.config.access?.update
  if (!accessFn) return false
  const result = await accessFn({ req, id: id as number, data: {} })
  if (typeof result === 'boolean') return result
  // Query-constraint access → confirm this specific doc satisfies it.
  const found = await req.payload.find({
    collection: slug,
    where: { and: [{ id: { equals: id } }, result] },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })
  return found.totalDocs > 0
}

/**
 * POST /api/editorial/transition — drives review-state transitions:
 *   submit          (any editor)  draft/changes_requested → in_review
 *   approve         (reviewer)    → published + approved
 *   request-changes (reviewer)    → changes_requested (+ note), stays draft
 * Updates run with EDITORIAL_SKIP so the publish gate doesn't re-route them.
 */
export const makeTransitionEndpoint = (collections: Set<string>): Endpoint => ({
  path: '/editorial/transition',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user
    // a real CMS account only, not e.g. an MCP key calling REST as itself
    if (!user || !isCmsUser(user)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body: Body = (await req.json?.()) ?? {}
    const { collection, id, action, note } = body

    if (!collection || id == null || !action || !collections.has(collection)) {
      return Response.json({ error: 'Bad request' }, { status: 400 })
    }

    const slug = collection as CollectionSlug
    // review fields aren't on the generic (union) collection data type, so cast.
    const update = (data: Record<string, unknown>, draft = false) =>
      req.payload.update({
        collection: slug,
        id,
        draft,
        data: data as never,
        req,
        overrideAccess: true,
        context: { [EDITORIAL_SKIP]: true },
      })

    if (action === 'submit') {
      if (!(await canUpdate(req, slug, id))) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      await update({ reviewStatus: 'in_review', submittedAt: new Date().toISOString() }, true)
      return Response.json({ ok: true, reviewStatus: 'in_review' })
    }

    if (!isReviewer(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'approve') {
      await update({ _status: 'published', reviewStatus: 'approved', reviewedBy: user.id })
      return Response.json({ ok: true, reviewStatus: 'approved' })
    }

    if (action === 'request-changes') {
      await update({ reviewStatus: 'changes_requested', reviewNote: note ?? '', reviewedBy: user.id }, true)
      return Response.json({ ok: true, reviewStatus: 'changes_requested' })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  },
})
