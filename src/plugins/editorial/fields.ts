import type { Field, FieldHook } from 'payload'
import { hasPermission } from 'payload-rbac-plugin'
import { EDITORIAL_REVIEW, isReviewer } from './access'

/**
 * Computes `canReview` from the RBAC permission system so the (client-side)
 * review panel knows whether to show reviewer actions — the client can't call
 * `hasPermission` reliably (permissions aren't guaranteed on the JWT). Fast path
 * uses the populated user; falls back to a role lookup when the read depth didn't
 * populate each role's permissions.
 */
const computeCanReview: FieldHook = async ({ data, req }) => {
  // In an afterRead field hook, `data` is the full document being read (the user).
  const user = data as { roles?: unknown } | undefined
  if (hasPermission(user as never, EDITORIAL_REVIEW)) return true

  const roles = Array.isArray(user?.roles) ? user.roles : []
  const ids = roles
    .map((r: unknown) => (r && typeof r === 'object' ? (r as { id?: unknown }).id : r))
    .filter((v: unknown) => v !== null && v !== undefined)
  if (ids.length === 0 || !req?.payload) return false

  const found = await req.payload.find({
    collection: 'roles' as never,
    where: { id: { in: ids } } as never,
    depth: 1,
    limit: 100,
    req,
    overrideAccess: true,
  })
  return found.docs.some((role: { permissions?: unknown }) => {
    const perms = Array.isArray(role.permissions) ? role.permissions : []
    return perms.some((p) => p && typeof p === 'object' && (p as { name?: unknown }).name === EDITORIAL_REVIEW)
  })
}

/** Virtual `canReview` flag injected into the auth collection for the review UI. */
export const canReviewField = (): Field => ({
  name: 'canReview',
  type: 'checkbox',
  virtual: true,
  admin: { hidden: true, readOnly: true },
  access: { create: () => false, update: () => false },
  hooks: { afterRead: [computeCanReview] },
})

/**
 * Review metadata + the review panel, appended to each target collection.
 * The status/note/reviewedBy fields are managed by the hook + transition
 * endpoint, so they're read-only in the form (the panel drives transitions).
 *
 * `readOnly` is only a UI lock — without field-level `access.update` a Redakteur
 * could PATCH `reviewStatus: 'approved'` straight through the REST API and fake a
 * review. So the managed fields are also locked to reviewers at the data layer;
 * the transition endpoint writes them with `overrideAccess`, so it's unaffected.
 */
export const reviewFields = (): Field[] => {
  const reviewerOnly = { update: ({ req }: { req: { user?: unknown } }) => isReviewer(req.user) }
  return [
    {
      name: 'reviewStatus',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Entwurf', value: 'draft' },
        { label: 'In Review', value: 'in_review' },
        { label: 'Änderungen erbeten', value: 'changes_requested' },
        { label: 'Freigegeben', value: 'approved' },
      ],
      access: reviewerOnly,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      label: 'Reviewer-Notiz',
      access: reviewerOnly,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      access: reviewerOnly,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'submittedAt',
      type: 'date',
      access: reviewerOnly,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'reviewPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/plugins/editorial/components/ReviewPanel#ReviewPanel',
        },
      },
    },
  ]
}
