import type { CollectionBeforeChangeHook } from 'payload'
import { isReviewer } from '../access'
import { EDITORIAL_SKIP } from '../types'

/**
 * beforeChange gate: when a non-reviewer tries to publish, the document is
 * routed into review instead of going live (reviewStatus = 'in_review', stays a
 * draft). Reviewers/admins publish normally and the doc is marked approved.
 */
export const makePublishGate =
  (reviewerRoles: string[]): CollectionBeforeChangeHook =>
  ({ data, req, context }) => {
    if (context?.[EDITORIAL_SKIP]) return data
    if (data?._status !== 'published') return data

    if (isReviewer(req.user, reviewerRoles)) {
      data.reviewStatus = 'approved'
      if (req.user?.id) data.reviewedBy = req.user.id
      return data
    }

    // editor attempted to publish → hold for review, do not go live
    data._status = 'draft'
    data.reviewStatus = 'in_review'
    data.submittedAt = new Date().toISOString()
    return data
  }
