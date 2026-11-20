import type { Access, FieldAccess } from 'payload'
import { isAdmin } from '@/plugins/editorial/access'

/**
 * "admin" = holds the `editorial:admin` RBAC permission (see plugins/editorial).
 * Used to lock down the meta collections (users, roles, permissions) so the
 * permission system itself can't be edited by non-admins.
 */
export const adminOnly: Access = ({ req }) => isAdmin(req.user)

/** Admins see all; everyone else only their own user (needed for auth / `me`). */
export const adminOrSelf: Access = ({ req: { user } }) =>
  isAdmin(user) ? true : user ? { id: { equals: user.id } } : false

/** For admin.hidden / hideRoles / hidePermissions — hide from the nav for non-admins. */
export const hideForNonAdmins = ({ user }: { user: unknown }): boolean => !isAdmin(user)

/** Any logged-in user. Role names aren't secret, and editors need them to see their own roles. */
export const loggedIn: Access = ({ req: { user } }) => Boolean(user)

/** Field-level read: admins, and the user reading their own account. Keeps
 *  email and IdP subject private now that logged-in users can read names. */
export const adminOrSelfField: FieldAccess = ({ req: { user }, doc }) =>
  isAdmin(user) || (Boolean(user) && doc?.id === user?.id)
