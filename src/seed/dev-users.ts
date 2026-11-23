import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Dev only: the reserved test accounts for trying the editorial workflow,
 * `editor@test.de` (Redakteur) and `reviewer@test.de` (Reviewer). Password from
 * DEV_USER_PASSWORD in .env, no default (B2: no known logins in code). Refuses
 * to run outside development. Idempotent: existing accounts only get their role
 * and password reset. Run `pnpm payload run src/seed/prod.ts` first if the roles
 * don't exist yet.
 *
 *   pnpm dev:users
 */
const ACCOUNTS = [
  { email: 'editor@test.de', name: 'Test Redakteur', role: 'Redakteur' },
  { email: 'reviewer@test.de', name: 'Test Reviewer', role: 'Reviewer' },
] as const

const run = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('dev:users is for development databases only.')
  const password = process.env.DEV_USER_PASSWORD
  if (!password) throw new Error('DEV_USER_PASSWORD is not set in .env.')

  const payload = await getPayload({ config })
  for (const a of ACCOUNTS) {
    const role = await payload.find({
      collection: 'roles' as never,
      where: { name: { equals: a.role } } as never,
      limit: 1,
    })
    const roleId = (role.docs[0] as { id?: number } | undefined)?.id
    if (!roleId) throw new Error(`Role ${a.role} missing: run pnpm payload run src/seed/prod.ts first.`)
    const existing = await payload.find({ collection: 'users', where: { email: { equals: a.email } }, limit: 1 })
    const data = { name: a.name, password, roles: [roleId] } as never
    if (existing.docs[0]) await payload.update({ collection: 'users', id: existing.docs[0].id, data })
    else await payload.create({ collection: 'users', data: { ...(data as object), email: a.email } as never })
    payload.logger.info(`dev user ready: ${a.email} (${a.role})`)
  }
}

try {
  await run()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
