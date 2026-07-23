export type ReviewStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved'

export interface EditorialOptions {
  /** Collection slugs the workflow applies to (must have versions.drafts). */
  collections: string[]
  /** Per-collection field names only reviewers may edit (editors see them locked). */
  lockedFields?: Record<string, string[]>
  /** Turn the plugin off without removing it from the config. */
  disabled?: boolean
}

/** Skips the publish gate when the transition endpoint drives the update itself. */
export const EDITORIAL_SKIP = 'editorialSkip'
