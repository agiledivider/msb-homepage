/**
 * Site search (S5.17), Tier B: Payload Local API on a throwaway SQLite DB.
 * Finds pages, posts and events in any spelling, never drafts or unapproved
 * versions, puts upcoming events above past ones, and counts per tab.
 */
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetSearchIndex, search } from '@/lib/search'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

const SKIP = { context: { [EDITORIAL_SKIP]: true } } as const
const LIVE = { _status: 'published', reviewStatus: 'approved' } as const
// A word no other test or seed uses, so only this file's documents match.
const WORD = 'Zwirbelfräse'
const NOW = new Date('2026-06-15T10:00:00Z')

let payload: Payload
let n = 0
const slug = (s: string) => `search-${s}-${++n}`

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()

  await payload.create({
    collection: 'blog',
    data: { title: `Die ${WORD} im Einsatz`, slug: slug('post'), excerpt: 'Ein Bericht.', ...LIVE } as never,
    ...SKIP,
  })
  await payload.create({
    collection: 'blog',
    data: { title: `Entwurf zur ${WORD}`, slug: slug('draft'), _status: 'draft', reviewStatus: 'draft' } as never,
    ...SKIP,
  })
  await payload.create({
    collection: 'blog',
    data: {
      title: `Ungeprüft: ${WORD}`,
      slug: slug('review'),
      _status: 'published',
      reviewStatus: 'in_review',
    } as never,
    ...SKIP,
  })
  await payload.create({
    collection: 'events',
    data: {
      title: 'Einweisung von gestern',
      slug: slug('past'),
      date: '2025-03-01T17:00:00Z',
      description: `Wir zeigen die ${WORD}.`,
      ...LIVE,
    } as never,
    ...SKIP,
  })
  await payload.create({
    collection: 'events',
    data: {
      title: 'Einweisung von morgen',
      slug: slug('next'),
      date: '2026-07-01T17:00:00Z',
      description: `Wir zeigen die ${WORD}.`,
      ...LIVE,
    } as never,
    ...SKIP,
  })
})

beforeEach(() => resetSearchIndex())

describe('site search', () => {
  it('finds published posts and events, never drafts or unapproved ones', async () => {
    const { hits, counts } = await search(WORD, { now: NOW })
    const titles = hits.map((h) => h.title.map((s) => s.text).join(''))
    expect(titles).toContain(`Die ${WORD} im Einsatz`)
    expect(titles.some((t) => t.startsWith('Entwurf'))).toBe(false)
    expect(titles.some((t) => t.startsWith('Ungeprüft'))).toBe(false)
    expect(counts).toMatchObject({ alle: 3, blog: 1, events: 2, seiten: 0 })
  })

  it('matches whatever the case or umlaut spelling', async () => {
    for (const q of ['zwirbelfraese', 'ZWIRBELFRÄSE', 'zwirbel']) {
      expect((await search(q, { now: NOW })).counts.alle, q).toBe(3)
    }
  })

  it('puts the upcoming event above the past one and says which is over', async () => {
    const { hits } = await search(WORD, { filter: 'events', now: NOW })
    expect(hits.map((h) => [h.title.map((s) => s.text).join(''), h.past])).toEqual([
      ['Einweisung von morgen', false],
      ['Einweisung von gestern', true],
    ])
    expect(hits[0].snippet.some((s) => s.hit && s.text === WORD)).toBe(true)
  })

  it('finds nothing for an empty or one-letter query', async () => {
    expect((await search('', { now: NOW })).hits).toEqual([])
    expect((await search('z', { now: NOW })).counts.alle).toBe(0)
  })
})
