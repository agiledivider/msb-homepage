/**
 * S9.5: the start page lists drafts nobody has submitted yet, with who saved
 * them last and whether through Claude (Tier B, Local API on a temp SQLite DB).
 * Each test asserts only on its own documents.
 */
import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { createLocalReq } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadOpenDrafts } from '@/plugins/editorial/components/ReviewDashboard'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload
let erika: Record<string, unknown>

const COLLECTIONS = ['blog', 'events', 'pages', 'workshops']

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  const user = await payload.create({
    collection: 'users',
    data: { email: `drafts-${randomUUID()}@test.de`, password: 'local-password', name: 'Erika Entwurf' } as never,
  })
  erika = { ...(await payload.findByID({ collection: 'users', id: user.id, depth: 2 })), collection: 'users' }
})

const reqAs = async (via?: 'MCP') => {
  const req = (await createLocalReq({ user: erika as never }, payload)) as PayloadRequest
  if (via) Object.assign(req, { payloadAPI: via })
  return req
}
const mine = async (title: string) => (await loadOpenDrafts(payload, COLLECTIONS, 500)).filter((d) => d.title === title)

const aLivePage = async (title: string) =>
  payload.create({
    collection: 'pages',
    context: { [EDITORIAL_SKIP]: true },
    data: { title, slug: `p-${randomUUID()}`, _status: 'published', reviewStatus: 'approved' } as never,
  })

describe('open drafts on the start page (S9.5)', () => {
  it('lists a new draft with who saved it', async () => {
    const title = `Neu ${randomUUID()}`
    await payload.create({
      collection: 'blog',
      data: { title, slug: `b-${randomUUID()}` } as never,
      draft: true,
      req: await reqAs(),
    })
    const [d] = await mine(title)
    expect(d).toMatchObject({ collection: 'blog', editor: 'Erika Entwurf', viaClaude: false })
  })

  it('lists a new draft of a live page written through Claude, marked as such', async () => {
    const title = `Live ${randomUUID()}`
    const page = await aLivePage(title)
    expect(await mine(title)).toEqual([])

    const changed = `${title} (Claude)`
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: changed } as never,
      draft: true,
      req: await reqAs('MCP'),
    })
    const [d] = await mine(changed)
    expect(d).toMatchObject({ collection: 'pages', editor: 'Erika Entwurf', viaClaude: true })
  })

  it('leaves out drafts in review and published documents', async () => {
    const inReview = `Eingereicht ${randomUUID()}`
    await payload.create({
      collection: 'events',
      context: { [EDITORIAL_SKIP]: true },
      data: {
        title: inReview,
        slug: `e-${randomUUID()}`,
        date: '2026-12-01T18:00:00.000Z',
        reviewStatus: 'in_review',
      } as never,
      draft: true,
    })
    const live = `Live ${randomUUID()}`
    await aLivePage(live)
    expect(await mine(inReview)).toEqual([])
    expect(await mine(live)).toEqual([])
  })

  it('drops a draft once it is published, newest drafts first', async () => {
    const older = `Älter ${randomUUID()}`
    const newer = `Neuer ${randomUUID()}`
    const a = await payload.create({
      collection: 'blog',
      data: { title: older, slug: `b-${randomUUID()}` } as never,
      draft: true,
      req: await reqAs(),
    })
    await new Promise((r) => setTimeout(r, 20))
    await payload.create({
      collection: 'blog',
      data: { title: newer, slug: `b-${randomUUID()}` } as never,
      draft: true,
      req: await reqAs(),
    })

    const all = await loadOpenDrafts(payload, COLLECTIONS, 500)
    expect(all.findIndex((d) => d.title === newer)).toBeLessThan(all.findIndex((d) => d.title === older))

    await payload.update({
      collection: 'blog',
      id: a.id,
      context: { [EDITORIAL_SKIP]: true },
      data: { _status: 'published', reviewStatus: 'approved' } as never,
    })
    expect(await mine(older)).toEqual([])
  })
})
