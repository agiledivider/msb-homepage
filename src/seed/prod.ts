import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { seedSiteContent } from './content'
import { upsertLegacyArticles } from './legacy'
import { upsertLegalPages } from './legal'

/**
 * Production seed, run on container start (after migrations). Idempotent:
 *  - creates the RBAC content permissions + the editorial:review/editorial:admin
 *    capabilities, and the Administrator / Reviewer / Redakteur roles,
 *  - if INIT_ADMIN_EMAIL + INIT_ADMIN_PASSWORD are set and that user doesn't
 *    exist yet, creates a ready-to-use admin (Administrator role) so a fresh
 *    deploy isn't locked out.
 *  - on a *fresh* DB only (no pages/blog/events yet), seeds the real launch
 *    content: hand-authored globals + pages, legal pages, and the migrated
 *    "Aktuelles" blog posts + events. Skipped once any content exists, so it
 *    never clobbers edits made through /admin.
 */

/** True only on a genuinely empty DB — nothing to clobber. */
const isFreshDb = async (payload: Payload) => {
  for (const collection of ['pages', 'blog', 'events'] as const) {
    const { totalDocs } = await payload.find({ collection, limit: 0 })
    if (totalDocs > 0) return false
  }
  return true
}
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
  // editorial capabilities: review = approve/publish, admin = manage users/roles/permissions
  for (const name of ['editorial:review', 'editorial:admin']) perms[name] = await permId(payload, name)

  const adminRole = await roleId(payload, 'Administrator', Object.values(perms))
  await roleId(
    payload,
    'Reviewer',
    ['blog', 'events', 'pages']
      .flatMap((c) => [`${c}:create`, `${c}:read`, `${c}:update`])
      .concat('editorial:review')
      .map((k) => perms[k]),
  )
  await roleId(
    payload,
    'Redakteur',
    ['blog:create', 'blog:read', 'blog:update', 'events:create', 'events:read', 'events:update'].map((k) => perms[k]),
  )
  payload.logger.info(`rbac: ${Object.keys(perms).length} permissions, roles Administrator/Reviewer/Redakteur`)

  const email = process.env.INIT_ADMIN_EMAIL
  const password = process.env.INIT_ADMIN_PASSWORD
  if (email && password) {
    const ex = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
    if (ex.totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: { email, password, name: 'Admin', roles: [adminRole] } as never,
      })
      payload.logger.info(`created init admin: ${email}`)
    }
  }

  // Launch content — only on a fresh DB, so editor changes are never overwritten.
  if (await isFreshDb(payload)) {
    payload.logger.info('fresh DB → seeding launch content')
    await seedSiteContent(payload) // globals (menu/footer/hero), pages
    await upsertLegalPages() // Impressum / Datenschutz / Haftung
    await upsertLegacyArticles() // migrated "Aktuelles" → real blog posts + events (301 redirects)
    payload.logger.info('✓ launch content seeded')
  } else {
    payload.logger.info('content already present → skipping content seed')
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
