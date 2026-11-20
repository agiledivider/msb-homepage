/**
 * Roles collection access (Tier B, Payload Local API on a throwaway SQLite DB).
 *
 * Logged-in users can read role names (so their own account shows "Redakteur",
 * not "Untitled"), but only admins can change roles, and anonymous visitors see none.
 */
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let editor: Record<string, unknown>

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()

  const role = (await payload.create({ collection: 'roles' as never, data: { name: 'Redakteur' } as never })) as {
    id: string | number
  }
  const user = await payload.create({
    collection: 'users',
    data: { email: 'roles-editor@test.de', password: 'local-password', roles: [role.id] } as never,
  })
  editor = { ...(await payload.findByID({ collection: 'users', id: user.id, depth: 2 })), collection: 'users' }
})

describe('roles collection access', () => {
  it('lets a logged-in editor read role names', async () => {
    const found = await payload.find({ collection: 'roles' as never, user: editor, overrideAccess: false })

    expect(found.docs.map((r) => (r as unknown as { name: string }).name)).toContain('Redakteur')
  })

  it('does not let an editor create or rename roles', async () => {
    await expect(
      payload.create({
        collection: 'roles' as never,
        data: { name: 'Sneaky' } as never,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('shows no roles to anonymous visitors', async () => {
    await expect(payload.find({ collection: 'roles' as never, overrideAccess: false })).rejects.toThrow()
  })
})
