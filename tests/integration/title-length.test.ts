/**
 * Title length (Tier B, Payload Local API on a throwaway SQLite DB): people
 * can't save a title too long for the start-page hero, but the long titles
 * imported from the old site keep saving, and seeds (no user) are free.
 */
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { TITLE_MAX } from '@/fields/title'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload
let user: Record<string, unknown>
let n = 0
const SKIP = { [EDITORIAL_SKIP]: true }
const long = (max: number) => `Ein sehr langer Titel ${'x'.repeat(max)}`

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  const u = await payload.create({
    collection: 'users',
    data: { email: 'title-length@test.de', password: 'local-password' } as never,
  })
  user = { ...u, collection: 'users' }
})

const create = (collection: 'blog' | 'events', title: string, asUser: boolean) =>
  payload.create({
    collection,
    data: {
      title,
      slug: `title-length-${++n}`,
      ...(collection === 'events' ? { date: '2026-12-01T18:00:00.000Z' } : {}),
    } as never,
    ...(asUser ? { user } : {}),
    context: SKIP,
  }) as unknown as Promise<{ id: number | string }>

describe('title length', () => {
  it.each([
    ['blog', TITLE_MAX.blog],
    ['events', TITLE_MAX.events],
  ] as const)('rejects a too-long %s title from a user, names the limit', async (collection, max) => {
    await expect(create(collection, long(max), true)).rejects.toThrow(/Titel/)
    await expect(create(collection, 'x'.repeat(max), true)).resolves.toBeTruthy()
  })

  it('lets seeds write long titles, and a user re-save an unchanged long title', async () => {
    const doc = await create('events', long(TITLE_MAX.events), false)
    await expect(
      payload.update({ collection: 'events', id: doc.id, data: { subtitle: 'neu' } as never, user, context: SKIP }),
    ).resolves.toBeTruthy()
    await expect(
      payload.update({
        collection: 'events',
        id: doc.id,
        data: { title: `${long(TITLE_MAX.events)} geändert` } as never,
        user,
        context: SKIP,
      }),
    ).rejects.toThrow(/Titel/)
  })
})
