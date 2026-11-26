/**
 * S5.13: imported Joomla posts get their author back, without touching editors'
 * work. Tier B: Payload Local API on a throwaway SQLite DB.
 */
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'
import { fillLegacyAuthors, LEGACY_AUTHORS } from '@/seed/legacyAuthors'

const SKIP = { context: { [EDITORIAL_SKIP]: true } } as const
let payload: Payload

// legacyIds from the real mapping: 1 → Stefan, 167 → Jan, 3/4 → Heribert
const aLegacyPost = (legacyId: number, overrides: Record<string, unknown> = {}) => ({
  title: `Alter Beitrag ${legacyId}`,
  slug: `legacy-authors-${legacyId}`,
  legacyId,
  publishedAt: '2017-08-22T20:50:14.000Z',
  _status: 'published',
  reviewStatus: 'approved',
  ...overrides,
})
const byLegacyId = async (legacyId: number, draft = false) =>
  (await payload.find({ collection: 'blog', where: { legacyId: { equals: legacyId } }, draft, limit: 1 })).docs[0]

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
})

// Fresh legacy posts for every test, so each one stands alone in any order (S6.9).
beforeEach(async () => {
  await payload.delete({ collection: 'blog', where: { legacyId: { exists: true } }, ...SKIP })
  await payload.create({ collection: 'blog', data: aLegacyPost(1) as never, ...SKIP })
  await payload.create({ collection: 'blog', data: aLegacyPost(167) as never, ...SKIP })
  // an editor already set an author: keep it
  await payload.create({ collection: 'blog', data: aLegacyPost(3, { author: 'Gastautorin' }) as never, ...SKIP })
  // an editor has an unpublished draft on top of the published post: leave it alone
  const drafted = await payload.create({ collection: 'blog', data: aLegacyPost(4) as never, ...SKIP })
  await payload.update({
    collection: 'blog',
    id: drafted.id,
    draft: true,
    data: { title: 'Neuer Titel in Arbeit', _status: 'draft' } as never,
    ...SKIP,
  })
})

describe('fillLegacyAuthors', () => {
  it('maps every legacy blog id to a name', () => {
    expect(Object.keys(LEGACY_AUTHORS)).toHaveLength(77)
    expect(LEGACY_AUTHORS[1]).toBe('Stefan') // named in the article itself, not the Joomla account
    expect(LEGACY_AUTHORS[167]).toBe('Jan')
  })

  it('fills empty authors only, keeps posts published and approved, skips drafts in progress', async () => {
    expect(await fillLegacyAuthors(payload)).toBe(2)

    const first = await byLegacyId(1)
    expect(first.author).toBe('Stefan')
    expect(first._status).toBe('published')
    expect(first.reviewStatus).toBe('approved')
    expect((await byLegacyId(167)).author).toBe('Jan')
    expect((await byLegacyId(3)).author).toBe('Gastautorin')

    const draft = await byLegacyId(4, true)
    expect(draft.title).toBe('Neuer Titel in Arbeit') // the editor's draft survived
    expect(draft.author ?? null).toBeNull()
  })

  it('changes nothing on a second run', async () => {
    await fillLegacyAuthors(payload)
    expect(await fillLegacyAuthors(payload)).toBe(0)
  })
})

describe('author of a new post', () => {
  it("starts as the writer's CMS name and can be overridden", async () => {
    const created = await payload.create({
      collection: 'users',
      data: { email: 'byline-editor@test.de', password: 'local-password', name: 'Erika Editor' } as never,
    })
    const user = { ...(await payload.findByID({ collection: 'users', id: created.id })), collection: 'users' }
    const base = { title: 'Neuer Beitrag', _status: 'draft' } as const

    const mine = await payload.create({
      collection: 'blog',
      data: { ...base, slug: 'byline-a' } as never,
      user: user as never,
      ...SKIP,
    })
    expect(mine.author).toBe('Erika Editor')

    const guest = await payload.create({
      collection: 'blog',
      data: { ...base, slug: 'byline-b', author: 'Gast' } as never,
      user: user as never,
      ...SKIP,
    })
    expect(guest.author).toBe('Gast')
  })
})
