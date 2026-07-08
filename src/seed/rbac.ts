import { getPayload } from 'payload'
import config from '@payload-config'
import type { Payload } from 'payload'

/**
 * Seeds RBAC demo data: CRUD permissions for the content collections, an
 * "Administrator" role (everything) for falk, and a limited "Redakteur" role
 * (blog + events, no pages/delete) for editor@test.de. Idempotent.
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

const assign = async (payload: Payload, email: string, roles: unknown[]) => {
  const u = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (u.totalDocs === 0) return
  await payload.update({ collection: 'users', id: u.docs[0].id, data: { roles } as never })
  payload.logger.info(`assigned ${email} → ${roles.length} role(s)`)
}

const run = async () => {
  const payload = await getPayload({ config })

  const perms: Record<string, unknown> = {}
  for (const c of COLLECTIONS) for (const a of ACTIONS) perms[`${c}:${a}`] = await permId(payload, `${c}:${a}`)
  payload.logger.info(`permissions: ${Object.keys(perms).length}`)

  const adminRole = await roleId(payload, 'Administrator', Object.values(perms))
  const redakteurRole = await roleId(
    payload,
    'Redakteur',
    ['blog:create', 'blog:read', 'blog:update', 'events:create', 'events:read', 'events:update'].map((k) => perms[k]),
  )

  await assign(payload, 'falk@kuehnel.eu', [adminRole])
  await assign(payload, 'reviewer@test.de', [adminRole])
  await assign(payload, 'editor@test.de', [redakteurRole])

  payload.logger.info('✓ rbac seeded')
}

try {
  await run()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
