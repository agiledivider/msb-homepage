/**
 * Workshops (S10.1, Tier B on a throwaway SQLite DB): the seed turns the six
 * workshops into public documents once, carries over what an editor entered on
 * the /werkzeug cards, never runs twice, and drafts stay off the public site.
 */
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload
const SKIP = { [EDITORIAL_SKIP]: true }

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  // The /werkzeug page as an editor left it: one card with its own verb line and drawing.
  await payload.create({
    collection: 'pages',
    context: SKIP,
    data: {
      title: 'Werkzeug & Räume',
      slug: 'werkzeug',
      _status: 'published',
      reviewStatus: 'approved',
      layout: [
        {
          blockType: 'workshops',
          variant: 'detailed',
          items: [{ title: 'Holzwerkstatt', verbs: 'Hobeln und leimen', icon: 'schere' }],
        },
      ],
    } as never,
  })
})

describe('workshops', () => {
  it('seeds six public workshops once, keeping what an editor wrote on /werkzeug', async () => {
    const { upsertWorkshops } = await import('@/seed/workshops')
    const { findPublic } = await import('@/lib/publicData')
    // Start from no workshops, whatever ran before in this file (S6.9: order-independent).
    await payload.delete({ collection: 'workshops', where: { id: { exists: true } }, context: SKIP })

    await upsertWorkshops(payload)
    const first = await findPublic({ collection: 'workshops', sort: 'order', limit: 50 })
    expect(first.docs.map((w) => w.slug)).toEqual(['elektronik', 'metall', 'holz', 'textil', '3d-druck', 'laser-cnc'])

    const holz = first.docs.find((w) => w.slug === 'holz')
    expect(holz?.verbs).toBe('Hobeln und leimen')
    expect(holz?.icon).toBe('schere')
    expect(holz?.machines?.every((m) => m.access === 'briefing')).toBe(true)

    await upsertWorkshops(payload)
    const all = await payload.find({ collection: 'workshops', limit: 0 })
    expect(all.totalDocs).toBe(6)
  })

  it('keeps a draft workshop off the public site', async () => {
    const { findPublic } = await import('@/lib/publicData')
    await payload.create({
      collection: 'workshops',
      context: SKIP,
      data: { title: 'Laser (Entwurf)', slug: 'laser-entwurf', _status: 'draft' } as never,
      draft: true,
    })
    const res = await findPublic({ collection: 'workshops', where: { slug: { equals: 'laser-entwurf' } } })
    expect(res.totalDocs).toBe(0)
  })
})
