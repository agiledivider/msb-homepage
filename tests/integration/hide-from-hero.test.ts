/**
 * "Nicht im Startseiten-Hero zeigen": a ticked event or post stays out of the
 * hero faces but keeps showing everywhere else. Asked for 2026-11-26 so the
 * weekly Offene Tür doesn't take the event face every week.
 */
import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }) }))

import { heroContent } from '@/lib/heroContent'
import { findPublic } from '@/lib/publicData'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

const SKIP = { context: { [EDITORIAL_SKIP]: true } } as const
const LIVE = { _status: 'published', reviewStatus: 'approved' } as const
const run = randomUUID().slice(0, 8)
const day = (offset: number) => new Date(Date.UTC(2031, 0, 10 + offset, 12)).toISOString()
// A "today" far in the future so only this file's events count as upcoming.
const since = new Date(Date.UTC(2031, 0, 10)).toISOString()

let payload: Payload
const anEvent = (slug: string, date: string, hideFromHero?: boolean) =>
  payload.create({
    collection: 'events',
    data: {
      title: slug,
      slug: `${slug}-${run}`,
      date,
      ...LIVE,
      ...(hideFromHero === undefined ? {} : { hideFromHero }),
    } as never,
    ...SKIP,
  })
const aPost = (slug: string, publishedAt: string, hideFromHero?: boolean) =>
  payload.create({
    collection: 'blog',
    data: {
      title: slug,
      slug: `${slug}-${run}`,
      publishedAt,
      ...LIVE,
      ...(hideFromHero === undefined ? {} : { hideFromHero }),
    } as never,
    ...SKIP,
  })

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  await anEvent('offene-tuer', day(0), true)
  await anEvent('loetworkshop', day(2))
  await aPost('normaler-post', day(-1))
  await aPost('interner-post', day(1), true)
})

describe('hero skips what is kept out of it', () => {
  it('shows the next event that may be in the hero, not the earlier hidden one', async () => {
    expect((await heroContent(since)).event?.slug).toBe(`loetworkshop-${run}`)
  })

  it('shows the newest post that may be in the hero', async () => {
    expect((await heroContent(since)).post?.slug).toBe(`normaler-post-${run}`)
  })

  it('treats an event without the setting as shown', async () => {
    const later = new Date(Date.UTC(2031, 0, 11)).toISOString()
    // Created without hideFromHero: the default (false) must count as "show".
    expect((await heroContent(later)).event?.slug).toBe(`loetworkshop-${run}`)
  })

  it('keeps a hidden event in the event lists', async () => {
    const list = await findPublic({ collection: 'events', where: { slug: { equals: `offene-tuer-${run}` } } })
    expect(list.docs).toHaveLength(1)
  })
})
