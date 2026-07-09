import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

/**
 * Assigns editorial roles: falk = admin, plus editor@test / reviewer@test
 * (password "test") for verifying the review workflow. Idempotent.
 *
 *   pnpm payload run src/seed/roles.ts
 */
const ensureUser = async (payload: Payload, email: string, password: string, name: string, roles: string[]) => {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (existing.totalDocs > 0) {
    await payload.update({ collection: 'users', id: existing.docs[0].id, data: { editorialRoles: roles } as never })
    payload.logger.info(`updated ${email} → [${roles.join(', ')}]`)
  } else {
    await payload.create({ collection: 'users', data: { email, password, name, editorialRoles: roles } as never })
    payload.logger.info(`created ${email} → [${roles.join(', ')}]`)
  }
}

const run = async () => {
  const payload = await getPayload({ config })
  await ensureUser(payload, 'falk@kuehnel.eu', 'test', 'Falk Kühnel', ['admin'])
  await ensureUser(payload, 'editor@test.de', 'test', 'Test Editor', ['editor'])
  await ensureUser(payload, 'reviewer@test.de', 'test', 'Test Reviewer', ['reviewer'])
  payload.logger.info('✓ roles seeded')
}

try {
  await run()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
