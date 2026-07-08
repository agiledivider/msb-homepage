import type { Field } from 'payload'
import { isAdmin } from './access'

/** `roles` select injected into the auth collection (editor/reviewer/admin). */
export const rolesField = (): Field => ({
  name: 'roles',
  type: 'select',
  hasMany: true,
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
 */
export const reviewFields = (): Field[] => [
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
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'reviewNote',
    type: 'textarea',
    label: 'Reviewer-Notiz',
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'reviewedBy',
    type: 'relationship',
    relationTo: 'users',
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'submittedAt',
    type: 'date',
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
