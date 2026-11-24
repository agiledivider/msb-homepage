/**
 * Frontend data boundary (Tier B, Payload Local API on a throwaway SQLite DB).
 *
 * Nothing that isn't published *and* editorially approved may reach an anonymous
 * visitor: not the page body, not `<head>` (title / description / og:*), not the
 * iCal feed. Fixtures carry a marker string so any leak is a plain substring hit.
 */
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Outside a Next request there is no draft-mode cookie store; anonymous = disabled.
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }) }))

import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

const LEAK = 'LEAKMARKER'
// Seeds/tests bypass the publish gate so the stored status is exactly what we set.
const SKIP = { context: { [EDITORIAL_SKIP]: true } } as const

type Status = { _status: 'draft' | 'published'; reviewStatus: 'draft' | 'in_review' | 'approved' }
const DRAFT: Status = { _status: 'draft', reviewStatus: 'draft' }
const UNAPPROVED: Status = { _status: 'published', reviewStatus: 'in_review' }
const LIVE: Status = { _status: 'published', reviewStatus: 'approved' }

const aBlogPost = (slug: string, status: Status, overrides: Record<string, unknown> = {}) => ({
  title: `${LEAK} title ${slug}`,
  slug,
  excerpt: `${LEAK} excerpt ${slug}`,
  subtitle: `${LEAK} subtitle ${slug}`,
  ...status,
  ...overrides,
})

const anEvent = (slug: string, status: Status, overrides: Record<string, unknown> = {}) => ({
  title: `${LEAK} title ${slug}`,
  slug,
  date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  description: `${LEAK} description ${slug}`,
  ...status,
  ...overrides,
})

const aPage = (slug: string, status: Status, overrides: Record<string, unknown> = {}) => ({
  title: `${LEAK} title ${slug}`,
  slug,
  layout: [{ blockType: 'pageIntro', headline: `${LEAK} headline`, lede: `${LEAK} lede ${slug}` }],
  ...status,
  ...overrides,
})

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

/** Next's notFound() throws an error whose digest names the 404 fallback. */
const expectNotFound = async (render: Promise<unknown>) => {
  await expect(render).rejects.toMatchObject({ digest: expect.stringContaining('404') })
}

let payload: Payload

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()

  await payload.create({ collection: 'blog', data: aBlogPost('draft-post', DRAFT) as never, ...SKIP })
  await payload.create({ collection: 'blog', data: aBlogPost('unapproved-post', UNAPPROVED) as never, ...SKIP })
  await payload.create({
    collection: 'blog',
    data: aBlogPost('live-post', LIVE, { title: 'Live post', excerpt: 'Live excerpt', subtitle: 'Live' }) as never,
    ...SKIP,
  })

  await payload.create({ collection: 'events', data: anEvent('draft-event', DRAFT) as never, ...SKIP })
  await payload.create({ collection: 'events', data: anEvent('unapproved-event', UNAPPROVED) as never, ...SKIP })
  await payload.create({
    collection: 'events',
    data: anEvent('live-event', LIVE, { title: 'Live event', description: 'Live description' }) as never,
    ...SKIP,
  })

  await payload.create({ collection: 'pages', data: aPage('draft-page', DRAFT) as never, ...SKIP })
  await payload.create({ collection: 'pages', data: aPage('unapproved-page', UNAPPROVED) as never, ...SKIP })
  await payload.create({
    collection: 'pages',
    data: aPage('live-page', LIVE, {
      title: 'Live page',
      layout: [{ blockType: 'pageIntro', headline: 'Wir sind', lede: '  Live lede  ' }],
    }) as never,
    ...SKIP,
  })

  // A live post with a pending (unreviewed) draft edit: the public sees the published version only.
  const edited = await payload.create({
    collection: 'blog',
    data: aBlogPost('edited-post', LIVE, {
      title: 'Published title',
      excerpt: 'Published excerpt',
      subtitle: 'P',
    }) as never,
    ...SKIP,
  })
  await payload.update({
    collection: 'blog',
    id: edited.id,
    draft: true,
    data: { title: `${LEAK} pending draft title`, excerpt: `${LEAK} pending draft excerpt`, _status: 'draft' } as never,
    ...SKIP,
  })
})

afterAll(async () => {
  await payload?.destroy()
})

describe('blog detail /blog/[slug]', () => {
  it.each(['draft-post', 'unapproved-post'])('generateMetadata(%s) returns nothing', async (slug) => {
    const { generateMetadata } = await import('@/app/(frontend)/blog/[slug]/page')
    const meta = await generateMetadata(params(slug))
    expect(JSON.stringify(meta)).not.toContain(LEAK)
    expect(meta).toEqual({})
  })

  it.each(['draft-post', 'unapproved-post'])('page body for %s 404s', async (slug) => {
    const { default: Page } = await import('@/app/(frontend)/blog/[slug]/page')
    await expectNotFound(Page(params(slug)))
  })

  it('generateMetadata of a live post with a pending draft shows the published version', async () => {
    const { generateMetadata } = await import('@/app/(frontend)/blog/[slug]/page')
    const meta = await generateMetadata(params('edited-post'))
    expect(meta.title).toBe('Published title')
    expect(JSON.stringify(meta)).not.toContain(LEAK)
  })

  it('generateMetadata of a live post still works', async () => {
    const { generateMetadata } = await import('@/app/(frontend)/blog/[slug]/page')
    const meta = await generateMetadata(params('live-post'))
    expect(meta.title).toBe('Live post')
    expect(meta.description).toBe('Live excerpt')
  })
})

describe('event detail /events/[slug]', () => {
  it.each(['draft-event', 'unapproved-event'])('generateMetadata(%s) returns nothing', async (slug) => {
    const { generateMetadata } = await import('@/app/(frontend)/events/[slug]/page')
    const meta = await generateMetadata(params(slug))
    expect(JSON.stringify(meta)).not.toContain(LEAK)
    expect(meta).toEqual({})
  })

  it.each(['draft-event', 'unapproved-event'])('page body for %s 404s', async (slug) => {
    const { default: Page } = await import('@/app/(frontend)/events/[slug]/page')
    await expectNotFound(Page(params(slug)))
  })

  it('generateMetadata of a live event still works', async () => {
    const { generateMetadata } = await import('@/app/(frontend)/events/[slug]/page')
    const meta = await generateMetadata(params('live-event'))
    expect(meta.title).toBe('Live event')
  })
})

describe('events/calendar.ics feed', () => {
  it('lists the live event and nothing unpublished or unapproved', async () => {
    const { GET } = await import('@/app/(frontend)/events/calendar.ics/route')
    const ics = await (await GET()).text()
    expect(ics).toContain('Live event')
    expect(ics).not.toContain(LEAK)
  })
})

describe('content page /[slug]', () => {
  it.each(['draft-page', 'unapproved-page'])('generateMetadata(%s) returns nothing', async (slug) => {
    const { generateMetadata } = await import('@/app/(frontend)/[slug]/page')
    const meta = await generateMetadata(params(slug))
    expect(JSON.stringify(meta)).not.toContain(LEAK)
    expect(meta).toEqual({})
  })

  it('a live page has its own title, description and link preview', async () => {
    const { generateMetadata } = await import('@/app/(frontend)/[slug]/page')
    const meta = await generateMetadata(params('live-page'))
    expect(meta.title).toBe('Live page')
    expect(meta.description).toBe('Live lede')
    expect(meta.alternates?.canonical).toBe('/live-page')
    expect(meta.openGraph).toMatchObject({ title: 'Live page', description: 'Live lede', url: '/live-page' })
  })
})

describe('sitemap.xml', () => {
  it('lists live pages, posts and events and nothing unpublished or unapproved', async () => {
    const { default: sitemap } = await import('@/app/(frontend)/sitemap')
    const urls = (await sitemap()).map((e) => new URL(e.url).pathname)
    expect(urls).toEqual(
      expect.arrayContaining(['/', '/blog', '/events', '/live-page', '/blog/live-post', '/events/live-event']),
    )
    expect(urls.filter((u) => /draft|unapproved/.test(u))).toEqual([])
  })
})

describe('robots.txt', () => {
  it('points crawlers at the sitemap and keeps them out of the CMS', async () => {
    const { default: robots } = await import('@/app/robots')
    const r = robots()
    expect(String(r.sitemap)).toMatch(/\/sitemap\.xml$/)
    expect(JSON.stringify(r.rules)).toContain('/admin')
  })
})

describe('static publisher crawl list', () => {
  it('asks the REST API for the same live docs the app shows', async () => {
    const { LIVE_DOCS_QUERY } = await import('../../scripts/publish-static')
    expect(new URLSearchParams(LIVE_DOCS_QUERY).get('where[reviewStatus][equals]')).toBe('approved')
    // Anonymous (no user, access enforced) like the publisher's fetch: published + that filter.
    const res = await payload.find({
      collection: 'pages',
      where: { reviewStatus: { equals: 'approved' } },
      overrideAccess: false,
      depth: 0,
    })
    expect(res.docs.map((d) => d.slug)).toEqual(['live-page'])
  })
})
