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

/**
 * A real CMS account (the `users` collection). Other auth collections, like the
 * MCP API keys, can authenticate REST calls as themselves; they carry no roles
 * and must not count as "logged in".
 */
export const isCmsUser = (user: unknown): boolean =>
  Boolean(user) && (user as { collection?: unknown }).collection === 'users'

/** Any logged-in CMS user. Role names aren't secret, and editors need them to see their own roles. */
export const loggedIn: Access = ({ req: { user } }) => isCmsUser(user)

/** Field-level read: admins, and the user reading their own account. Keeps
 *  email and IdP subject private now that logged-in users can read names. */
export const adminOrSelfField: FieldAccess = ({ req: { user }, doc }) =>
  isAdmin(user) || (Boolean(user) && doc?.id === user?.id)
