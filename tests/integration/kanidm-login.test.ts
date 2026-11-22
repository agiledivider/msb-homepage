/**
 * Kanidm sign-in (Tier B, real Payload + the real payload-oauth2 callback on a
 * throwaway SQLite DB; Kanidm is faked at the network boundary via `fetch`).
 *
 * CMS rights must always follow Kanidm group membership, and a Kanidm identity
 * may only take over an existing account through a verified email address.
 */
import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The OIDC plugin reads these when the config module loads, so set them before
// the dynamic config import below. Fake values; nothing leaves the process.
process.env.KANIDM_ISSUER = 'https://idm.test.invalid'
process.env.KANIDM_CLIENT_ID = 'msb-payload'
process.env.KANIDM_CLIENT_SECRET = 'test-secret'
process.env.KANIDM_ROLES_CLAIM = 'cms_roles'

let payload: Payload
let callback: (req: PayloadRequest) => Promise<Response>
const roleIds: Record<string, string | number> = {}

/** What the fake Kanidm userinfo endpoint returns for the next login. */
let userinfo: Record<string, unknown> = {}

const fakeKanidm = async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input)
  if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'fake-access-token' })
  if (url.includes('/userinfo')) return Response.json(userinfo)
  return new Response('unexpected request', { status: 500 })
}

const aKanidmUser = (email: string, overrides: Record<string, unknown> = {}) => ({
  sub: `sub-${email}`,
  email,
  email_verified: true,
  name: `Kanidm ${email}`,
  ...overrides,
})

/** Run the real OAuth callback as if Kanidm had redirected the browser back. */
const loginWithKanidm = async (claims: Record<string, unknown>) => {
  userinfo = claims
  const req = {
    method: 'GET',
    query: { code: 'fake-code' },
    headers: new Headers(),
    payload,
    context: {},
  } as unknown as PayloadRequest
  const res = await callback(req)
  return res.headers.get('Location')
}

const aUser = async (email: string, roles: string[]) =>
  payload.create({
    collection: 'users',
    data: { email, password: 'local-password', name: email, roles: roles.map((r) => roleIds[r]) } as never,
  })

const rolesOf = async (email: string) => {
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 1, limit: 1 })
  const user = found.docs[0] as unknown as { roles?: { name: string }[]; sub?: string } | undefined
  return user && { roles: (user.roles ?? []).map((r) => r.name).sort(), sub: user.sub }
}

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn(fakeKanidm))
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()

  for (const name of ['Administrator', 'Reviewer', 'Redakteur']) {
    const role = await payload.create({ collection: 'roles' as never, data: { name } as never })
    roleIds[name] = (role as unknown as { id: string | number }).id
  }

  const endpoint = (payload.collections.users.config.endpoints || []).find((e) => e.path === '/oauth/kanidm/callback')
  if (!endpoint) throw new Error('Kanidm callback endpoint not registered — is the OIDC plugin enabled?')
  callback = endpoint.handler as unknown as typeof callback
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('Kanidm login keeps CMS rights in sync with Kanidm groups', () => {
  it('removes every CMS role from a user taken out of all Kanidm role groups', async () => {
    await aUser('removed@test.de', ['Administrator'])

    // Kanidm leaves the claim-map claim out when the user is in none of its groups.
    const location = await loginWithKanidm(aKanidmUser('removed@test.de'))

    expect(location).toBe('/admin')
    expect((await rolesOf('removed@test.de'))?.roles).toEqual([])
  })

  it('applies a role change made in Kanidm at the next login', async () => {
    await aUser('demoted@test.de', ['Administrator'])

    await loginWithKanidm(aKanidmUser('demoted@test.de', { cms_roles: ['editor'] }))

    expect((await rolesOf('demoted@test.de'))?.roles).toEqual(['Redakteur'])
  })

  it('gives a new Kanidm user exactly the roles from their groups', async () => {
    await loginWithKanidm(aKanidmUser('newcomer@test.de', { cms_roles: 'reviewer editor' }))

    expect((await rolesOf('newcomer@test.de'))?.roles).toEqual(['Redakteur', 'Reviewer'])
  })
})

describe('Kanidm login never takes over an account through an unverified email', () => {
  it.each([
    ['email_verified false', { email_verified: false }],
    ['email_verified missing', { email_verified: undefined }],
    ['email_verified as a string', { email_verified: 'true' }],
  ])('refuses an existing account when %s', async (_label, override) => {
    const email = `victim-${Object.keys(override)[0]}-${String(Object.values(override)[0])}@test.de`
    await aUser(email, ['Administrator'])

    const location = await loginWithKanidm(aKanidmUser(email, { cms_roles: ['admin'], ...override }))

    expect(location).toBe('/admin/login?error=oauth')
    expect(await rolesOf(email)).toEqual({ roles: ['Administrator'], sub: null })
  })

  it('creates no account for an unverified email', async () => {
    const location = await loginWithKanidm(aKanidmUser('unverified-new@test.de', { email_verified: false }))

    expect(location).toBe('/admin/login?error=oauth')
    expect(await rolesOf('unverified-new@test.de')).toBeUndefined()
  })
})

describe('the Kanidm strategy and other Bearer tokens', () => {
  // Claude's MCP key arrives as `Authorization: Bearer <key>`. It is no JWT, and
  // the strategy used to log "Invalid Compact JWS" as an ERROR on every call.
  const kanidm = () => {
    const strategy = payload.collections.users.config.auth.strategies?.find((s) => s.name === 'kanidm')
    if (!strategy) throw new Error('kanidm strategy not registered')
    return strategy
  }

  it('ignores a Bearer token that is not a JWT, without logging an error', async () => {
    const error = vi.spyOn(payload.logger, 'error')
    try {
      const result = await kanidm().authenticate({
        headers: new Headers({ Authorization: 'Bearer 0b9f6c2e-mcp-api-key-not-a-jwt' }),
        payload,
      } as never)

      expect(result.user).toBeNull()
      expect(error).not.toHaveBeenCalled()
    } finally {
      error.mockRestore()
    }
  })

  it('still logs in a user with a token Payload signed for them', async () => {
    const user = (await aUser(`jwt-${Date.now()}@test.de`, ['Redakteur'])) as unknown as { email: string }
    const { token } = await payload.login({
      collection: 'users',
      data: { email: user.email, password: 'local-password' },
    })

    const result = await kanidm().authenticate({
      headers: new Headers({ Authorization: `JWT ${token}` }),
      payload,
    } as never)

    expect((result.user as { email?: string } | null)?.email).toBe(user.email)
  })
})
