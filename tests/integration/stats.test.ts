/**
 * S5.11: the beacon endpoint counts page views into per-day totals, keeps
 * nothing about the visitor, and only the CMS can read the totals.
 * Tier B: Payload on a throwaway SQLite DB; each test uses its own days, so
 * tests don't see each other's counts.
 */
import type { Payload, PayloadRequest } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { statsHitHandler } from '@/plugins/stats/endpoint'
import { loadStats, titlesFor } from '@/plugins/stats/load'
import { MAX_PATHS_PER_DAY, recordHit } from '@/plugins/stats/record'

let payload: Payload

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
})

const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'

/** A beacon request as a browser on the site sends it. */
function beacon(body: unknown, headers: Record<string, string> = {}, user: unknown = null): PayloadRequest {
  const h = new Headers({
    origin: 'https://makerspacebonn.de',
    host: 'makerspacebonn.de',
    'sec-fetch-site': 'same-origin',
    'user-agent': BROWSER,
    'content-type': 'text/plain',
    ...headers,
  })
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return { headers: h, user, payload, text: async () => text } as unknown as PayloadRequest
}

/** The handler with a fixed clock, so every test writes to its own day. */
const at = (iso: string) => statsHitHandler({ now: () => new Date(iso), record: recordHit })

const pagesOn = (day: string) =>
  payload.find({ collection: 'stat-pages', where: { day: { equals: day } }, pagination: false, sort: 'path' })
const sourcesOn = (day: string) =>
  payload.find({ collection: 'stat-sources', where: { day: { equals: day } }, pagination: false, sort: 'source' })

describe('POST /api/stats/hit', () => {
  it('counts views and visits per path, and the source of each visit', async () => {
    const hit = at('2026-01-05T10:00:00Z')
    expect((await hit(beacon({ p: '/blog/post', r: 'https://www.google.de/search?q=x' }))).status).toBe(204)
    await hit(beacon({ p: '/blog/post', r: 'https://l.facebook.com/l.php' }))
    await hit(beacon({ p: '/events', n: true })) // clicked on inside the site
    await hit(beacon({ p: '/events', r: 'https://makerspacebonn.de/blog/post' })) // full load from own page

    const pages = (await pagesOn('2026-01-05')).docs.map(({ path, views, visits }) => ({ path, views, visits }))
    expect(pages).toEqual([
      { path: '/blog/post', views: 2, visits: 2 },
      { path: '/events', views: 2, visits: 0 },
    ])
    const sources = (await sourcesOn('2026-01-05')).docs.map(({ kind, source, visits }) => ({ kind, source, visits }))
    expect(sources).toEqual([
      { kind: 'social', source: 'facebook.com', visits: 1 },
      { kind: 'search', source: 'google.de', visits: 1 },
    ])
  })

  it('loses no count when many hits arrive at once', async () => {
    const hit = at('2026-01-06T10:00:00Z')
    await Promise.all(Array.from({ length: 40 }, () => hit(beacon({ p: '/', r: 'https://duckduckgo.com/' }))))
    const [row] = (await pagesOn('2026-01-06')).docs
    expect(row).toMatchObject({ path: '/', views: 40, visits: 40 })
    expect((await sourcesOn('2026-01-06')).docs[0]).toMatchObject({ source: 'duckduckgo.com', visits: 40 })
  })

  it('stores nothing about the visitor', async () => {
    const hit = at('2026-01-07T10:00:00Z')
    await hit(
      beacon(
        { p: '/suche?q=anna-mueller', r: 'https://www.google.de/search?q=anna-mueller' },
        { 'x-forwarded-for': '203.0.113.77', 'user-agent': `${BROWSER} Anna` },
      ),
    )
    const stored = JSON.stringify([(await pagesOn('2026-01-07')).docs, (await sourcesOn('2026-01-07')).docs])
    expect(stored).toContain('/suche')
    expect(stored).not.toMatch(/anna|203\.0\.113|iPhone|Mozilla/i)
  })

  it.each([
    ['another site', { 'sec-fetch-site': 'cross-site' }, 403],
    ['a request without Sec-Fetch-Site from elsewhere', { 'sec-fetch-site': '', origin: 'https://evil.example' }, 403],
    ['a bot', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }, 204],
    ['a client without user agent', { 'user-agent': '' }, 204],
  ])('does not count %s', async (_name, headers, status) => {
    const day = '2026-01-08'
    const res = await at(`${day}T10:00:00Z`)(beacon({ p: '/not-counted' }, headers))
    expect(res.status).toBe(status)
    expect((await pagesOn(day)).totalDocs).toBe(0)
  })

  it('does not count logged-in CMS users', async () => {
    const day = '2026-01-09'
    await at(`${day}T10:00:00Z`)(beacon({ p: '/' }, {}, { id: 1, collection: 'users' }))
    expect((await pagesOn(day)).totalDocs).toBe(0)
  })

  it('rejects a body that is not JSON, ignores one that is not a hit', async () => {
    const hit = at('2026-01-10T10:00:00Z')
    expect((await hit(beacon('not json'))).status).toBe(400)
    expect((await hit(beacon({ p: '/admin/collections/users' }))).status).toBe(204)
    expect((await hit(beacon('x'.repeat(5000)))).status).toBe(413)
    expect((await pagesOn('2026-01-10')).totalDocs).toBe(0)
  })

  it('stops adding new paths for a day at the cap, but keeps counting existing ones', async () => {
    const day = '2026-01-11'
    for (let i = 0; i < MAX_PATHS_PER_DAY; i++) {
      await recordHit(payload, { day, path: `/spam-${i}`, visit: false, source: null })
    }
    await recordHit(payload, { day, path: '/one-too-many', visit: false, source: null })
    await recordHit(payload, { day, path: '/spam-0', visit: false, source: null })
    const pages = await payload.find({ collection: 'stat-pages', where: { day: { equals: day } }, limit: 1 })
    expect(pages.totalDocs).toBe(MAX_PATHS_PER_DAY)
    const first = await payload.find({
      collection: 'stat-pages',
      where: { and: [{ day: { equals: day } }, { path: { in: ['/spam-0', '/one-too-many'] } }] },
    })
    expect(first.docs.map((d) => [d.path, d.views])).toEqual([['/spam-0', 2]])
  })
})

describe('the totals', () => {
  it('can be read by CMS users only, and written by nobody through the API', async () => {
    await expect(payload.find({ collection: 'stat-pages', overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'stat-sources', overrideAccess: false })).rejects.toThrow()
    const user = { id: 1, collection: 'users' } as never
    await expect(payload.find({ collection: 'stat-pages', overrideAccess: false, user })).resolves.toBeTruthy()
    await expect(
      payload.create({
        collection: 'stat-pages',
        data: { day: '2026-01-12', path: '/fake', views: 1000, visits: 1000 },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })

  it('come back per day for the period, days without visits as zero', async () => {
    const hit = at('2026-02-02T10:00:00Z')
    await hit(beacon({ p: '/mitmachen', r: 'https://www.bonn.de/' }))
    await hit(beacon({ p: '/mitmachen', n: true }))
    await at('2026-02-04T10:00:00Z')(beacon({ p: '/mitmachen' }))

    const stats = await loadStats(payload, { from: '2026-02-01', to: '2026-02-04', preset: null })
    expect(stats.days).toEqual([
      { day: '2026-02-01', visits: 0, views: 0 },
      { day: '2026-02-02', visits: 1, views: 2 },
      { day: '2026-02-03', visits: 0, views: 0 },
      { day: '2026-02-04', visits: 1, views: 1 },
    ])
    expect(stats.pages).toEqual([{ path: '/mitmachen', views: 3, visits: 2 }])
    expect(stats.sources).toEqual([
      { kind: 'site', source: 'bonn.de', visits: 1 }, // ties ordered by name
      { kind: 'direct', source: 'direkt', visits: 1 },
    ])
    expect(stats.since).not.toBeNull()
  })

  it('show page titles instead of paths where a document exists', async () => {
    await payload.create({
      collection: 'pages',
      data: { title: 'Mitmachen im MakerSpace', slug: 'mitmachen-titel', _status: 'published' } as never,
    })
    const titles = await titlesFor(payload, ['/', '/mitmachen-titel', '/blog/seite/3', '/gibt-es-nicht'])
    expect(Object.fromEntries(titles)).toEqual({
      '/': 'Startseite',
      '/mitmachen-titel': 'Mitmachen im MakerSpace',
      '/blog/seite/3': 'Blog, Seite 3',
    })
  })
})
