import type { CollectionBeforeChangeHook } from 'payload'
import { isReviewer } from '../access'
import { EDITORIAL_SKIP } from '../types'

/** Fields that change when a document is only filed elsewhere, not edited. */
const FILING_FIELDS = new Set(['folder', 'updatedAt'])

/**
 * True when an update to a published document changes nothing but its folder.
 * Filing isn't an edit, so it must not send a live page back to review. Any
 * other difference (or an unsure comparison) counts as an edit: the safe side.
 */
const onlyFiled = (data: Record<string, unknown>, original: Record<string, unknown> | undefined): boolean => {
  if (original?._status !== 'published') return false
  const id = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : (v ?? null))
  if (id(data.folder) === id(original.folder)) return false
  return Object.keys(data).every(
    (k) => FILING_FIELDS.has(k) || JSON.stringify(data[k] ?? null) === JSON.stringify(original[k] ?? null),
  )
}

/**
 * beforeChange gate: when a non-reviewer tries to publish, the document is
 * routed into review instead of going live (reviewStatus = 'in_review', stays a
 * draft). Reviewers/admins publish normally and the doc is marked approved.
 * Moving a published document into another folder passes unchanged.
 */
export const makePublishGate =
  (): CollectionBeforeChangeHook =>
  ({ data, req, context, operation, originalDoc }) => {
    if (context?.[EDITORIAL_SKIP]) return data
    if (data?._status !== 'published') return data
    if (operation === 'update' && onlyFiled(data, originalDoc)) return data

    if (isReviewer(req.user)) {
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
