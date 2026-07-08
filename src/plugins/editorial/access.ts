/**
 * Role helpers. They accept `unknown` so callers can pass `req.user` / the admin
 * `ClientUser` directly — `editorialRoles` is injected by this plugin at runtime
 * and may not exist on the generated `User` type yet, so we read it defensively.
 */
const roleSet = (user: unknown): Set<string> => {
  const roles = (user as { editorialRoles?: unknown } | null | undefined)?.editorialRoles
  const arr = Array.isArray(roles) ? roles : []
  return new Set(arr.filter((r): r is string => typeof r === 'string'))
}

export const hasAnyRole = (user: unknown, roles: readonly string[]): boolean => {
  const has = roleSet(user)
  return roles.some((r) => has.has(r))
}

export const isAdmin = (user: unknown): boolean => hasAnyRole(user, ['admin'])

export const isReviewer = (user: unknown, reviewerRoles: readonly string[]): boolean =>
  hasAnyRole(user, reviewerRoles)
