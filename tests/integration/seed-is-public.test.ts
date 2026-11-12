/**
 * The site-content seed (also run by the prod seed) must produce content the
 * public frontend actually shows: published *and* approved, as findPublic sees it.
 */
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  const { seedSiteContent } = await import('@/seed/content')
  await seedSiteContent(payload)
})

afterAll(async () => {
  await payload?.destroy()
})

describe('seedSiteContent', () => {
  it.each(['blog', 'events', 'pages'] as const)('seeded %s is visible through findPublic', async (collection) => {
    const { findPublic } = await import('@/lib/publicData')
    const seeded = await payload.find({ collection, where: { _status: { equals: 'published' } }, limit: 0 })
    const visible = await findPublic({ collection, limit: 0 })
    expect(seeded.totalDocs).toBeGreaterThan(0)
    expect(visible.totalDocs).toBe(seeded.totalDocs)
  })
})
