/**
 * A draft-mode cookie left over from a CMS session shows no drafts once the
 * session is gone (logout, expired login). Reported 2026-11-26: after logging
 * out of the admin, the public site still showed an unpublished workshop draft.
 */
import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The browser still sends the draft-mode cookie; the auth header varies per test.
let requestHeaders = new Headers()
vi.mock('next/headers', () => ({
  draftMode: async () => ({ isEnabled: true }),
  headers: async () => requestHeaders,
}))

import { findForRequest, isDraftRequest } from '@/lib/publicData'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload
const slug = `stale-cookie-${randomUUID()}`
let token: string

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  await payload.create({
    collection: 'blog',
    data: { title: 'Unpublished draft', slug, _status: 'draft', reviewStatus: 'draft' } as never,
    context: { [EDITORIAL_SKIP]: true },
  })
  const email = `stale-cookie-${randomUUID()}@test.de`
  await payload.create({ collection: 'users', data: { email, password: 'local-password' } as never })
  const login = await payload.login({ collection: 'users', data: { email, password: 'local-password' } })
  token = login.token ?? ''
})

beforeEach(() => {
  requestHeaders = new Headers()
})

const findDraft = async () =>
  (await findForRequest({ collection: 'blog', where: { slug: { equals: slug } }, limit: 1 })).docs

describe('draft-mode cookie without a CMS session', () => {
  it('shows no drafts after logout', async () => {
    expect(await isDraftRequest()).toBe(false)
    expect(await findDraft()).toEqual([])
  })

  it('shows no drafts with an invalid login cookie', async () => {
    requestHeaders = new Headers({ cookie: 'payload-token=not-a-real-token' })
    expect(await findDraft()).toEqual([])
  })

  it('still shows drafts while the editor is logged in', async () => {
    // A browser navigation on the site itself (S2.5: Payload checks where a cookie request comes from).
    requestHeaders = new Headers({ cookie: `payload-token=${token}`, 'sec-fetch-site': 'same-origin' })
    expect(await isDraftRequest()).toBe(true)
    expect((await findDraft()).map((d) => d.slug)).toEqual([slug])
  })

  it('shows no drafts when another site sends the login cookie along (S2.5)', async () => {
    requestHeaders = new Headers({ cookie: `payload-token=${token}`, origin: 'https://evil.example' })
    expect(await findDraft()).toEqual([])
  })
})
