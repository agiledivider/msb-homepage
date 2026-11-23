import type { Endpoint } from 'payload'
import { generatePayloadCookie } from 'payload'
import { DEV_ACCOUNTS, devLoginEnabled, isDevAccount } from '@/lib/devLogin'

/** POST /api/dev/login-as { who: 'editor' | 'reviewer' } — dev only, see src/lib/devLogin.ts. */
export const devLoginEndpoint: Endpoint = {
  path: '/dev/login-as',
  method: 'post',
  handler: async (req) => {
    // Registered only in development; checked again so a misconfigured server can't use it.
    if (!devLoginEnabled(process.env)) return Response.json({ error: 'Not found' }, { status: 404 })
    const body = ((await req.json?.()) ?? {}) as { who?: unknown }
    if (!isDevAccount(body.who)) return Response.json({ error: 'Unknown account' }, { status: 400 })

    const { email } = DEV_ACCOUNTS[body.who]
    try {
      const { token } = await req.payload.login({
        collection: 'users',
        data: { email, password: process.env.DEV_USER_PASSWORD as string },
        req,
      })
      if (!token) throw new Error('no token')
      const cookie = generatePayloadCookie({
        collectionAuthConfig: req.payload.collections.users.config.auth,
        cookiePrefix: req.payload.config.cookiePrefix,
        token,
      })
      return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookie } })
    } catch {
      return Response.json({ error: `Login als ${email} fehlgeschlagen: pnpm dev:users ausführen.` }, { status: 401 })
    }
  },
}
