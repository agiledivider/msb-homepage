import { extractJWT, type PayloadRequest, type Plugin, parseCookies } from 'payload'
import { OAuth2Plugin } from 'payload-oauth2'
import { parseKanidmUserInfo } from './claims'

/**
 * Kanidm (OIDC) sign-in for the Payload admin, layered on top of the built-in
 * email/password login (both stay available — keep a local admin as break-glass
 * for when the IdP is unreachable).
 *
 * Enabled only when the three required env vars are set, so a deployment without
 * Kanidm configured simply keeps password-only login:
 *
 *   KANIDM_ISSUER=https://idm.example.com        # base URL, no trailing slash
 *   KANIDM_CLIENT_ID=payload                      # the oauth2 client name
 *   KANIDM_CLIENT_SECRET=…                         # `kanidm system oauth2 show-basic-secret payload`
 *
 * Kanidm setup: `scripts/kanidm-setup.sh` (DEPLOY.md "Configure Kanidm"). The
 * `dienst_<client>` group's scope map decides who may log in; claim maps put a
 * clean `cms_roles` value (`editor`, `admin`) into the token, so Kanidm sends
 * only what this app needs, no group list, no UUIDs. Override the claim name
 * with KANIDM_ROLES_CLAIM.
 *
 * Two Kanidm specifics the generic plugin needs help with, handled below:
 *   1. the token endpoint requires HTTP Basic auth (client_secret_basic), not a
 *      secret in the POST body → custom `getToken`.
 *   2. PKCE S256 is mandatory → `pkceEnabled: true`; the verifier the authorize
 *      endpoint stashes in the `pkce_verifier` cookie is forwarded on exchange.
 */

const issuer = (process.env.KANIDM_ISSUER ?? '').replace(/\/+$/, '')
const clientId = process.env.KANIDM_CLIENT_ID ?? ''
const clientSecret = process.env.KANIDM_CLIENT_SECRET ?? ''
const serverURL = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
// Name of the Kanidm claim-map claim carrying editorial role values.
const rolesClaim = process.env.KANIDM_ROLES_CLAIM || 'cms_roles'

/** Whether Kanidm SSO is wired up (mirrored by the login button, which hides itself otherwise). */
export const kanidmEnabled = Boolean(issuer && clientId && clientSecret)

// Derived from the discovery document's URL scheme
// (https://idm.example.com/oauth2/openid/:client_id:/.well-known/openid-configuration).
const authorizationUrl = `${issuer}/ui/oauth2`
const tokenEndpoint = `${issuer}/oauth2/token`
const userinfoEndpoint = `${issuer}/oauth2/openid/${clientId}/userinfo`

// Where Kanidm sends the browser back — must match the registered redirect URL.
const redirectUri = `${serverURL}/api/users/oauth/kanidm/callback`

/** Exchange the authorization code using HTTP Basic auth + the PKCE verifier cookie. */
const getToken = async (code: string, req: PayloadRequest): Promise<string> => {
  const codeVerifier = req?.headers ? parseCookies(req.headers).get('pkce_verifier') : undefined

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  if (codeVerifier) body.append('code_verifier', codeVerifier)

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      // Kanidm expects client_id:client_secret via HTTP Basic, not in the body.
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: body.toString(),
  })

  const data = (await res.json().catch(() => ({}))) as { access_token?: unknown }
  if (!res.ok || typeof data.access_token !== 'string') {
    throw new Error(`Kanidm token exchange failed (${res.status}): ${JSON.stringify(data)}`)
  }
  return data.access_token
}

const baseKanidmOAuth = OAuth2Plugin({
  enabled: kanidmEnabled,
  strategyName: 'kanidm',
  // Match/link users by email so an existing password account and its Kanidm
  // identity are the same Payload user.
  useEmailAsIdentity: true,
  serverURL,
  clientId,
  clientSecret,
  authCollection: 'users',
  authorizePath: '/oauth/kanidm',
  callbackPath: '/oauth/kanidm/callback',
  providerAuthorizationUrl: authorizationUrl,
  tokenEndpoint,
  // Roles come from the `cms_roles` claim map (see header), so the noisy
  // `groups` scope is intentionally omitted.
  scopes: ['openid', 'email', 'profile'],
  pkceEnabled: true,
  getToken,
  getUserInfo: async (accessToken: string, req: PayloadRequest) => {
    const res = await fetch(userinfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Kanidm userinfo request failed (${res.status})`)
    }
    // Verified email + roles that always follow Kanidm group membership (claims.ts).
    const { email, sub, name, roleNames } = parseKanidmUserInfo(await res.json(), rolesClaim)

    // RBAC role names → Role doc IDs (the `roles` relationship, the source of
    // truth for authorization). Always written, so a user removed from every
    // Kanidm role group loses their CMS rights at this login.
    let roleIds: (string | number)[] = []
    if (roleNames.length > 0) {
      const found = await req.payload.find({
        collection: 'roles',
        where: { name: { in: roleNames } },
        depth: 0,
        limit: 100,
        req,
        overrideAccess: true,
      })
      roleIds = found.docs.map((r) => r.id)
      if (roleIds.length < roleNames.length) {
        req.payload.logger.warn(
          { requested: roleNames, resolved: found.docs.map((r) => r.name) },
          'Kanidm OIDC — some role names have no matching RBAC role (check seeded role names)',
        )
      }
    }

    return { email, sub, name, roles: roleIds }
  },
  successRedirect: () => '/admin',
  failureRedirect: (req: PayloadRequest, err?: unknown) => {
    req.payload.logger.error({ err }, 'Kanidm OIDC login failed')
    return '/admin/login?error=oauth'
  },
})

/** A compact JWS: three base64url parts. Everything else can't be a session token. */
const COMPACT_JWS = /^[\w-]+\.[\w-]+\.[\w-]*$/

/**
 * payload-oauth2 (1.0.21) verifies every `Authorization: Bearer …` as a JWT and
 * logs a failure as ERROR. Claude's MCP key is sent that way and is no JWT, so
 * each MCP call logged "Invalid Compact JWS". Skip tokens that can't be a JWS;
 * real JWTs still go through the plugin unchanged.
 */
export const kanidmOAuth: Plugin = async (incoming) => {
  const config = await baseKanidmOAuth(incoming)
  return {
    ...config,
    collections: config.collections?.map((c) => {
      if (c.slug !== 'users' || typeof c.auth !== 'object') return c
      const strategies = c.auth.strategies?.map((st) =>
        st.name === 'kanidm'
          ? {
              ...st,
              authenticate: async (args: Parameters<typeof st.authenticate>[0]) => {
                const token = extractJWT(args)
                if (token && !COMPACT_JWS.test(token)) return { user: null }
                return st.authenticate(args)
              },
            }
          : st,
      )
      return { ...c, auth: { ...c.auth, strategies } }
    }),
  }
}
