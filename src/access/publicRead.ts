import type { Access } from 'payload'

/**
 * Public read for draft-enabled collections.
 *
 * Anonymous callers only ever see `_status: published` docs; authenticated
 * users see everything (needed for the admin UI and live preview, which also
 * pass `overrideAccess: true`). A blanket `read: () => true` leaks drafts —
 * never-published docs live in the main table with `_status: 'draft'`, so a
 * plain `find`/`findByID` (REST, GraphQL, and the `/[slug]` detail routes)
 * would return them to the public.
 */
export const publicRead: Access = ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } })
