import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

/**
 * Seeds RBAC dev data: content CRUD permissions + the editorial:review /
 * editorial:admin capabilities, the Administrator / Reviewer / Redakteur roles,
 * and three test users (password "test") — falk=Administrator,
 * reviewer@test.de=Reviewer, editor@test.de=Redakteur. Idempotent.
 *
 *   pnpm payload run src/seed/rbac.ts
 */
const COLLECTIONS = ['blog', 'events', 'pages']
const ACTIONS = ['create', 'read', 'update', 'delete']

type IdDoc = { id: string | number }
const find = (payload: Payload, collection: string, where: object) =>
  payload.find({ collection: collection as never, where: where as never, limit: 1 }) as unknown as Promise<{
    totalDocs: number
    docs: IdDoc[]
  }>
const create = (payload: Payload, collection: string, data: object) =>
  payload.create({ collection: collection as never, data: data as never }) as unknown as Promise<IdDoc>

const permId = async (payload: Payload, name: string) => {
  const ex = await find(payload, 'permissions', { name: { equals: name } })
  if (ex.totalDocs > 0) return ex.docs[0].id
  return (await create(payload, 'permissions', { type: 'single', name })).id
}

const roleId = async (payload: Payload, name: string, permissions: unknown[]) => {
  const ex = await find(payload, 'roles', { name: { equals: name } })
  if (ex.totalDocs > 0) {
    await payload.update({ collection: 'roles' as never, id: ex.docs[0].id, data: { permissions } as never })
    return ex.docs[0].id
  }
  return (await create(payload, 'roles', { name, permissions })).id
}

/** Assign roles to an existing user, or create the test user if missing. */
const ensureUser = async (payload: Payload, email: string, password: string, name: string, roles: unknown[]) => {
  const u = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (u.totalDocs > 0) {
    await payload.update({ collection: 'users', id: u.docs[0].id, data: { roles } as never })
    payload.logger.info(`assigned ${email} → ${roles.length} role(s)`)
  } else {
    await payload.create({ collection: 'users', data: { email, password, name, roles } as never })
    payload.logger.info(`created ${email} → ${roles.length} role(s)`)
  }
}

const run = async () => {
  const payload = await getPayload({ config })

  const perms: Record<string, unknown> = {}
  for (const c of COLLECTIONS) for (const a of ACTIONS) perms[`${c}:${a}`] = await permId(payload, `${c}:${a}`)
  for (const name of ['editorial:review', 'editorial:admin']) perms[name] = await permId(payload, name)
  payload.logger.info(`permissions: ${Object.keys(perms).length}`)

  const adminRole = await roleId(payload, 'Administrator', Object.values(perms))
  const reviewerRole = await roleId(
    payload,
    'Reviewer',
    ['blog', 'events', 'pages']
      .flatMap((c) => [`${c}:create`, `${c}:read`, `${c}:update`])
      .concat('editorial:review')
      .map((k) => perms[k]),
  )
  const redakteurRole = await roleId(
    payload,
    'Redakteur',
    ['blog:create', 'blog:read', 'blog:update', 'events:create', 'events:read', 'events:update'].map((k) => perms[k]),
  )

  await ensureUser(payload, 'falk@kuehnel.eu', 'test', 'Falk Kühnel', [adminRole])
  await ensureUser(payload, 'reviewer@test.de', 'test', 'Test Reviewer', [reviewerRole])
  await ensureUser(payload, 'editor@test.de', 'test', 'Test Editor', [redakteurRole])

  payload.logger.info('✓ rbac seeded')
}

try {
  await run()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
