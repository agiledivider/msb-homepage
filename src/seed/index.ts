import config from '@payload-config'
import { getPayload } from 'payload'
import { seedSiteContent } from './content'
import { upsertLegalPages } from './legal'

/**
 * Dev seed. Creates local dev users, wipes the content collections for a clean
 * slate, then seeds the hand-authored core content + legal pages. The migrated
 * "Aktuelles" articles and the 200 demo events are seeded separately, on demand:
 *
 *   pnpm payload run src/seed/run-legacy.ts   # real migrated blog + events
 *   pnpm payload run src/seed/events.ts       # 200 synthetic demo events
 *
 * (Production seeds real content on first boot instead — see src/seed/prod.ts.)
 */
const seed = async () => {
  const payload = await getPayload({ config })
  payload.logger.info('— Seeding MakerSpace Bonn (dev) —')

  // 1 · dev users (create only if missing)
  const users = await payload.find({ collection: 'users', limit: 1 })
  if (users.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        name: 'Admin',
        email: process.env.PAYLOAD_SEED_EMAIL || 'admin@makerspacebonn.de',
        password: process.env.PAYLOAD_SEED_PASSWORD || 'changeme123',
      },
    })
    payload.logger.info(`admin user: ${process.env.PAYLOAD_SEED_EMAIL || 'admin@makerspacebonn.de'}`)
  }

  const falk = await payload.find({
    collection: 'users',
    where: { email: { equals: 'falk@kuehnel.eu' } },
    limit: 1,
  })
  if (falk.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: { name: 'Falk Kühnel', email: 'falk@kuehnel.eu', password: 'test' },
    })
    payload.logger.info('admin user: falk@kuehnel.eu')
  }

  // wipe content collections so re-running is a clean slate (keeps users)
  for (const collection of ['pages', 'blog', 'events', 'media'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }

  // 2 · hand-authored content + legal pages
  await seedSiteContent(payload)
  await upsertLegalPages()

  payload.logger.info('✓ Seed complete.')
}

// top-level await so `payload run` waits for the async work to finish
try {
  await seed()
  process.exit(0)
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
}
