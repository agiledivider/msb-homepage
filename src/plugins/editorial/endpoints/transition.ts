import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload'
import { isReviewer } from '../access'
import { EDITORIAL_SKIP } from '../types'

type Body = { collection?: string; id?: string | number; action?: string; note?: string }

/**
 * POST /api/editorial/transition — drives review-state transitions:
 *   submit          (any editor)  draft/changes_requested → in_review
 *   approve         (reviewer)    → published + approved
 *   request-changes (reviewer)    → changes_requested (+ note), stays draft
 * Updates run with EDITORIAL_SKIP so the publish gate doesn't re-route them.
 */
export const makeTransitionEndpoint = (reviewerRoles: string[], collections: Set<string>): Endpoint => ({
  path: '/editorial/transition',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

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
      await update({ reviewStatus: 'in_review', submittedAt: new Date().toISOString() }, true)
      return Response.json({ ok: true, reviewStatus: 'in_review' })
    }

    if (!isReviewer(user, reviewerRoles)) {
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
