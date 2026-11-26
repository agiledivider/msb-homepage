/**
 * Which browsers may act with an editor's login cookie, and how that cookie
 * is sent (S2.5).
 *
 * Payload only checks the Origin of cookie-authenticated requests when its
 * `csrf` list is non-empty; empty (the default) lets any site's page send
 * requests with the editor's cookie. Bearer/API-key requests (MCP, scripts)
 * are not affected.
 */
type Env = Record<string, string | undefined>

const DEV_ORIGIN = 'http://localhost:3000'

/** The site's own origin from NEXT_PUBLIC_SERVER_URL (no path, no trailing slash). */
export function siteOrigin(env: Env): string {
  return new URL(env.NEXT_PUBLIC_SERVER_URL || DEV_ORIGIN).origin
}

/** Origins allowed to make cookie-authenticated requests: the site itself (plus localhost in dev). */
export function trustedOrigins(env: Env): string[] {
  const own = siteOrigin(env)
  return env.NODE_ENV === 'development' && own !== DEV_ORIGIN ? [own, DEV_ORIGIN] : [own]
}

/** Login cookie: HTTPS-only whenever the site runs on https; Lax so the Kanidm redirect back still logs in. */
export function authCookies(env: Env): { secure: boolean; sameSite: 'Lax' } {
  return { secure: siteOrigin(env).startsWith('https://'), sameSite: 'Lax' }
}

/** A login ends after this much inactivity (the admin renews it while in use). */
export const TOKEN_EXPIRATION_SECONDS = 2 * 60 * 60
