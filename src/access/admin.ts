import type { Access } from 'payload'
import { isAdmin } from '@/plugins/editorial/access'

/**
 * "admin" = the editorial `admin` role (editorialRoles includes 'admin').
 * Used to lock down the meta collections (users, roles, permissions) so the
 * permission system itself can't be edited by non-admins.
 */
export const adminOnly: Access = ({ req }) => isAdmin(req.user)

/** Admins see all; everyone else only their own user (needed for auth / `me`). */
export const adminOrSelf: Access = ({ req: { user } }) =>
  isAdmin(user) ? true : user ? { id: { equals: user.id } } : false

/** For admin.hidden / hideRoles / hidePermissions — hide from the nav for non-admins. */
export const hideForNonAdmins = ({ user }: { user: unknown }): boolean => !isAdmin(user)
