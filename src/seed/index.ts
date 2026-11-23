import config from '@payload-config'
import { getPayload } from 'payload'
import { seedSiteContent } from './content'
import { upsertLegacyArticles } from './legacy'
import { upsertLegalPages } from './legal'

/**
 * Dev seed. Creates the local dev admin (from .env), wipes the content collections for a clean
 * slate, then seeds the hand-authored core content, the legal pages and the
 * migrated "Aktuelles" articles (the real blog posts + events; there is no
 * made-up demo content). Production seeds the same on first boot, see prod.ts.
 */
const seed = async () => {
  const payload = await getPayload({ config })
  payload.logger.info('— Seeding MakerSpace Bonn (dev) —')

  // 1 · dev admin (only into an empty users table). No built-in credentials:
  // email and password come from .env, so no known password ships anywhere (B2).
  const users = await payload.find({ collection: 'users', limit: 1 })
  if (users.totalDocs === 0) {
    const email = process.env.PAYLOAD_SEED_EMAIL || 'admin@makerspacebonn.de'
    const password = process.env.PAYLOAD_SEED_PASSWORD
    if (!password)
      throw new Error('No users yet and PAYLOAD_SEED_PASSWORD is not set in .env: refusing to create an admin.')
    await payload.create({ collection: 'users', data: { name: 'Admin', email, password } })
    payload.logger.info(`admin user: ${email}`)
  }

  // wipe content collections so re-running is a clean slate (keeps users)
  for (const collection of ['pages', 'blog', 'events', 'media'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }

  // 2 · hand-authored content, legal pages, migrated blog posts + events
  await seedSiteContent(payload)
  await upsertLegalPages()
  await upsertLegacyArticles()

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
