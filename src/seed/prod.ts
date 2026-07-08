import { getPayload } from 'payload'
import config from '@payload-config'
import type { Payload } from 'payload'

/**
 * Production seed, run on container start (after migrations). Idempotent:
 *  - creates the RBAC CRUD permissions for the content collections,
 *  - creates an "Administrator" role (everything) and a "Redakteur" role,
 *  - if INIT_ADMIN_EMAIL + INIT_ADMIN_PASSWORD are set and that user doesn't
 *    exist yet, creates a ready-to-use admin (editorialRoles=admin +
 *    Administrator role) so a fresh deploy isn't locked out.
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
  return ex.totalDocs ? ex.docs[0].id : (await create(payload, 'permissions', { type: 'single', name })).id
}

const roleId = async (payload: Payload, name: string, permissions: unknown[]) => {
  const ex = await find(payload, 'roles', { name: { equals: name } })
  if (ex.totalDocs) {
    await payload.update({ collection: 'roles' as never, id: ex.docs[0].id, data: { permissions } as never })
    return ex.docs[0].id
  }
  return (await create(payload, 'roles', { name, permissions })).id
}

const run = async () => {
  const payload = await getPayload({ config })

  const perms: Record<string, unknown> = {}
  for (const c of COLLECTIONS) for (const a of ACTIONS) perms[`${c}:${a}`] = await permId(payload, `${c}:${a}`)

  const adminRole = await roleId(payload, 'Administrator', Object.values(perms))
  await roleId(
    payload,
    'Redakteur',
    ['blog:create', 'blog:read', 'blog:update', 'events:create', 'events:read', 'events:update'].map((k) => perms[k]),
  )
  payload.logger.info(`rbac: ${Object.keys(perms).length} permissions, roles Administrator/Redakteur`)

  const email = process.env.INIT_ADMIN_EMAIL
  const password = process.env.INIT_ADMIN_PASSWORD
  if (email && password) {
    const ex = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
    if (ex.totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: { email, password, name: 'Admin', editorialRoles: ['admin'], roles: [adminRole] } as never,
      })
      payload.logger.info(`created init admin: ${email}`)
    }
  }

  payload.logger.info('✓ prod seed done')
}

try {
  await run()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
