import { hasPermission } from 'payload-rbac-plugin'

/**
 * Editorial capability checks, sourced from the RBAC permission system
 * (payload-rbac-plugin) — the single source of truth for roles. On authenticated
 * requests `req.user.roles` is populated with each role's permissions, which is
 * what `hasPermission` reads (the same mechanism the collections' `checkPermission`
 * access relies on).
 *
 *   review → `editorial:review` (approve / request-changes / publish)
 *   admin  → `editorial:admin`  (manage users, roles, permissions)
 */
export const EDITORIAL_REVIEW = 'editorial:review'
export const EDITORIAL_ADMIN = 'editorial:admin'

// hasPermission accepts the Payload user shape; callers pass req.user / the admin
// ClientUser, typed loosely as `unknown` here.
type RbacUser = Parameters<typeof hasPermission>[0]

export const isReviewer = (user: unknown): boolean => hasPermission(user as RbacUser, EDITORIAL_REVIEW)

export const isAdmin = (user: unknown): boolean => hasPermission(user as RbacUser, EDITORIAL_ADMIN)
