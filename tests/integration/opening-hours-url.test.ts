/**
 * The calendar link behind the start-page opening hours (S5.12) can be a secret
 * Google address: visitors must never read it through the API, CMS users can.
 * Tier B: Payload Local API on a throwaway SQLite DB.
 */
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

const SECRET_URL = 'https://calendar.google.com/calendar/ical/x/private-abc123/basic.ics'
let payload: Payload

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  await payload.updateGlobal({
    slug: 'siteSettings',
    data: { openingHours: { icsUrl: SECRET_URL, fallback: [{ day: 'Mi', note: 'Offen', time: '15–21' }] } },
  })
})

describe('opening-hours calendar link', () => {
  it('is hidden from anonymous readers, the fallback rows are not', async () => {
    const site = await payload.findGlobal({ slug: 'siteSettings', overrideAccess: false })
    expect(site.openingHours?.icsUrl).toBeUndefined()
    expect(site.openingHours?.fallback?.[0]?.note).toBe('Offen')
    expect(JSON.stringify(site)).not.toContain('private-abc123')
  })

  it('is visible to a logged-in CMS user', async () => {
    const created = await payload.create({
      collection: 'users',
      data: { email: 'hours-editor@test.de', password: 'local-password', name: 'Hanna Hours' } as never,
    })
    const user = { ...(await payload.findByID({ collection: 'users', id: created.id })), collection: 'users' }
    const site = await payload.findGlobal({ slug: 'siteSettings', overrideAccess: false, user: user as never })
    expect(site.openingHours?.icsUrl).toBe(SECRET_URL)
  })

  it('rejects a link that is not https or webcal', async () => {
    await expect(
      payload.updateGlobal({ slug: 'siteSettings', data: { openingHours: { icsUrl: 'http://example.org/cal.ics' } } }),
    ).rejects.toThrow()
  })
})
