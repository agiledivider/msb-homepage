/**
 * Folders (Tier B, Payload Local API on a throwaway SQLite DB).
 *
 * Logged-in editors file media, pages, posts and events into folders; anonymous
 * visitors see no folders; and moving a published page into a folder does not
 * send it back through the editorial publish gate.
 */
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload
let editor: Record<string, unknown>

type Doc = { id: string | number; folder?: unknown; _status?: string; reviewStatus?: string }

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()

  // An editor who may update pages but is no reviewer: their publishes go to review.
  const perm = (await payload.create({
    collection: 'permissions' as never,
    data: { type: 'single', name: 'pages:update' } as never,
  })) as unknown as Doc
  const role = (await payload.create({
    collection: 'roles' as never,
    data: { name: 'Ordner-Redakteur', permissions: [perm.id] } as never,
  })) as unknown as Doc
  const user = await payload.create({
    collection: 'users',
    data: { email: 'folders-editor@test.de', password: 'local-password', roles: [role.id] } as never,
  })
  editor = { ...(await payload.findByID({ collection: 'users', id: user.id, depth: 2 })), collection: 'users' }
})

const createFolder = (name: string) =>
  payload.create({
    collection: 'payload-folders' as never,
    data: { name } as never,
    user: editor,
    overrideAccess: false,
  }) as unknown as Promise<Doc>

describe('folders', () => {
  it('lets a logged-in editor create a folder', async () => {
    const folder = await createFolder('Werkstatt-Fotos')

    expect(folder.id).toBeDefined()
  })

  it('shows no folders to anonymous visitors', async () => {
    await createFolder('Intern')

    await expect(payload.find({ collection: 'payload-folders' as never, overrideAccess: false })).rejects.toThrow()
  })

  it('keeps a published page published and approved when an editor files it into a folder', async () => {
    const folder = await createFolder('Verein')
    const page = (await payload.create({
      collection: 'pages',
      data: { title: 'Ordner-Test', slug: 'ordner-test', _status: 'published', reviewStatus: 'approved' } as never,
      context: { [EDITORIAL_SKIP]: true },
    })) as unknown as Doc

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { folder: folder.id } as never,
      user: editor,
      overrideAccess: false,
    })

    const live = (await payload.findByID({ collection: 'pages', id: page.id, depth: 0 })) as unknown as Doc
    expect(live.folder).toBe(folder.id)
    expect(live._status).toBe('published')
    expect(live.reviewStatus).toBe('approved')
  })

  it('still sends a real edit to review when it comes with a folder move', async () => {
    const folder = await createFolder('Mitmachen')
    const page = (await payload.create({
      collection: 'pages',
      data: { title: 'Ordner-Edit', slug: 'ordner-edit', _status: 'published', reviewStatus: 'approved' } as never,
      context: { [EDITORIAL_SKIP]: true },
    })) as unknown as Doc

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { folder: folder.id, title: 'Ordner-Edit, geändert' } as never,
      user: editor,
      overrideAccess: false,
    })

    const live = (await payload.findByID({ collection: 'pages', id: page.id, depth: 0 })) as unknown as Doc
    expect(live.reviewStatus).toBe('in_review')
  })

  it.each(['media', 'pages', 'blog', 'events'])('enables folders on %s', (slug) => {
    expect(payload.collections[slug as 'pages'].config.folders).toBeTruthy()
  })
})
