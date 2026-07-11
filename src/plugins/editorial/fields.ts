import type { Field } from 'payload'
import { isAdmin, isReviewer } from './access'

/** `editorialRoles` select injected into the auth collection (editor/reviewer/admin).
 *  Named `editorialRoles` (not `roles`) to avoid colliding with general-purpose
 *  RBAC plugins that add their own `roles` field. */
export const rolesField = (): Field => ({
  name: 'editorialRoles',
  type: 'select',
  hasMany: true,
  label: 'Redaktions-Rollen',
  saveToJWT: true, // available on req.user without a DB lookup
  defaultValue: ['editor'],
  options: [
    { label: 'Editor', value: 'editor' },
    { label: 'Reviewer', value: 'reviewer' },
    { label: 'Admin', value: 'admin' },
  ],
  access: {
    // only admins may change roles (prevents self-escalation)
    update: ({ req }) => isAdmin(req.user),
  },
  admin: { position: 'sidebar' },
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
export const reviewFields = (reviewerRoles: string[]): Field[] => {
  const reviewerOnly = { update: ({ req }: { req: { user?: unknown } }) => isReviewer(req.user, reviewerRoles) }
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
