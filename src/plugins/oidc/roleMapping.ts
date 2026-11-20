/**
 * Maps the Kanidm roles claim (emitted via an OAuth2 claim map — default claim
 * name `cms_roles`, override with KANIDM_ROLES_CLAIM) onto **RBAC role names**,
 * the single source of truth for authorization (see src/plugins/editorial).
 *
 * The claim carries clean role values directly — `admin` | `reviewer` | `editor`
 * — assigned by Kanidm group membership. Each maps to the matching RBAC role:
 *
 *   admin    → Administrator
 *   reviewer → Reviewer
 *   editor   → Redakteur
 *
 * The role hierarchy (admin ⊇ reviewer ⊇ editor) is encoded in each role's
 * permission set, so no expansion is needed here.
 */

/** cms_roles value → RBAC role name (must match the seeded role names). */
const ROLE_BY_CLAIM: Record<string, string> = {
  admin: 'Administrator',
  reviewer: 'Reviewer',
  editor: 'Redakteur',
}

/** Normalise the claim to a list of strings. Handles the array join strategy
 *  (a JSON array) as well as the csv/ssv strategies (a delimited string). */
const toValues = (claim: unknown): string[] => {
  if (Array.isArray(claim)) return claim.filter((v): v is string => typeof v === 'string')
  if (typeof claim === 'string') return claim.split(/[,\s]+/).filter((s) => s.length > 0)
  return []
}

/**
 * Resolve the RBAC role names for the roles claim.
 *
 * An absent claim yields `[]`: Kanidm omits a claim-map claim when the user is in
 * none of its groups, so "absent" means "removed from every role group" and must
 * revoke CMS rights (deny by default). Unknown values are ignored.
 */
export const mapClaimToRoleNames = (claim: unknown): string[] => {
  const names = new Set<string>()
  for (const value of toValues(claim)) {
    const name = ROLE_BY_CLAIM[value.trim().toLowerCase()]
    if (name) names.add(name)
  }
  return [...names]
}
