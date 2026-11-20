import { mapClaimToRoleNames } from './roleMapping'

/** What a Kanidm userinfo response must provide before anyone is logged in. */
export type KanidmIdentity = {
  email: string
  sub: string
  name: string | undefined
  /** RBAC role names granted by Kanidm group membership; `[]` = no CMS rights. */
  roleNames: string[]
}

/** A Kanidm login that must be refused, with a reason safe to log. */
export class KanidmLoginRejected extends Error {
  override name = 'KanidmLoginRejected'
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined)

/**
 * Parse the Kanidm userinfo claims into the identity the CMS acts on.
 *
 * - **Verified email only.** Accounts are matched by email (`useEmailAsIdentity`),
 *   so an unverified address could take over an existing CMS account. Anything
 *   but `email_verified: true` is refused.
 * - **Roles always follow Kanidm.** Kanidm leaves a claim-map claim out entirely
 *   when the user is in none of its groups, so a missing claim means "no role"
 *   and clears the user's roles. Break-glass is the local password admin.
 */
export const parseKanidmUserInfo = (raw: unknown, rolesClaim: string): KanidmIdentity => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new KanidmLoginRejected('Kanidm userinfo is not a JSON object')
  }
  const claims = raw as Record<string, unknown>

  const sub = str(claims.sub)
  if (!sub) throw new KanidmLoginRejected('Kanidm userinfo has no subject (sub)')

  const email = str(claims.email)
  if (!email) {
    throw new KanidmLoginRejected('Kanidm account has no email — add a mail attribute or grant the `email` scope.')
  }
  if (claims.email_verified !== true) {
    throw new KanidmLoginRejected('Kanidm email is not verified — refusing to link it to a CMS account.')
  }

  return {
    email,
    sub,
    name: str(claims.name) ?? str(claims.preferred_username),
    roleNames: mapClaimToRoleNames(claims[rolesClaim]),
  }
}
