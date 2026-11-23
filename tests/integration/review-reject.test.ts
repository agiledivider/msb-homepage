/**
 * Rejecting in the review panel always carries a reason, and the author sees it
 * (Tier B, Payload Local API on a throwaway SQLite DB).
 */
import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { createLocalReq } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload
let reviewer: Record<string, unknown>

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  const perm = await payload.create({
    collection: 'permissions' as never,
    data: { type: 'single', name: 'editorial:review' } as never,
  })
  const role = await payload.create({
    collection: 'roles' as never,
    data: { name: `reject-${randomUUID()}`, permissions: [(perm as { id: number }).id] } as never,
  })
  const user = await payload.create({
    collection: 'users',
    data: {
      email: `reject-${randomUUID()}@test.de`,
      password: 'local-password',
      roles: [(role as { id: number }).id],
    } as never,
  })
  reviewer = { ...(await payload.findByID({ collection: 'users', id: user.id, depth: 2 })), collection: 'users' }
})

const transition = async (body: Record<string, unknown>) => {
  const endpoint = payload.config.endpoints.find((e) => e.path === '/editorial/transition')
  if (!endpoint) throw new Error('no transition endpoint')
  const req = (await createLocalReq({ user: reviewer as never }, payload)) as PayloadRequest
  Object.assign(req, { json: async () => body })
  return endpoint.handler(req)
}

const aPostInReview = async () => {
  const post = await payload.create({
    collection: 'blog',
    context: { [EDITORIAL_SKIP]: true },
    data: { title: 'Eingereicht', slug: `reject-${randomUUID()}`, reviewStatus: 'in_review' } as never,
    draft: true,
  })
  return post.id
}

describe('rejecting a draft', () => {
  it('is refused without a reason and leaves the draft in review', async () => {
    const id = await aPostInReview()
    const res = await transition({ collection: 'blog', id, action: 'request-changes', note: '   ' })
    expect(res.status).toBe(400)
    const doc = await payload.findByID({ collection: 'blog', id, draft: true })
    expect(doc.reviewStatus).toBe('in_review')
  })

  it('stores the reason for the author', async () => {
    const id = await aPostInReview()
    const res = await transition({ collection: 'blog', id, action: 'request-changes', note: ' Bitte Datum ergänzen ' })
    expect(res.status).toBe(200)
    const doc = await payload.findByID({ collection: 'blog', id, draft: true })
    expect(doc.reviewStatus).toBe('changes_requested')
    expect(doc.reviewNote).toBe('Bitte Datum ergänzen')
  })
})
