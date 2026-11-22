/**
 * PASSWORD_LOGIN: may people log into the CMS with email and password?
 *
 *   off  only Kanidm (default in production)
 *   on   email/password as well (default in development and tests)
 *
 * Off on servers: Payload's database then holds no usable way in that bypasses
 * Kanidm (decided 2026-11-22, after a dev backup brought test accounts with the
 * password "test" onto staging). Emergency access when Kanidm is misconfigured:
 * someone with server access sets PASSWORD_LOGIN=on and recreates the container
 * (DEPLOY.md, "Password login"). The users' password fields stay in the
 * schema either way, so switching needs no migration.
 */
export function passwordLoginEnabled(env: Record<string, string | undefined>): boolean {
  const value = env.PASSWORD_LOGIN?.trim().toLowerCase()
  if (value === 'on') return true
  if (value === 'off') return false
  if (value) throw new Error(`PASSWORD_LOGIN must be "on" or "off", got "${env.PASSWORD_LOGIN}".`)
  return env.NODE_ENV !== 'production'
}
