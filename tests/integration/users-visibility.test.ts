/**
 * Who can see which user data (Tier B, Payload Local API on a throwaway SQLite DB).
 *
 * Logged-in users see each other's names (lock dialog, "Geprüft von"), but an
 * email address or Kanidm subject is only visible to its owner and to admins.
 */
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let editor: Record<string, unknown>
let colleagueId: string | number

const asUser = async (id: string | number) => ({
  ...(await payload.findByID({ collection: 'users', id, depth: 2 })),
  collection: 'users',
})

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()

  const editorDoc = await payload.create({
    collection: 'users',
    data: { email: 'vis-editor@test.de', password: 'local-password', name: 'Erika Editor' } as never,
  })
  const colleague = await payload.create({
    collection: 'users',
    data: {
      email: 'vis-colleague@test.de',
      password: 'local-password',
      name: 'Karl Kollege',
      sub: 'kanidm-karl',
    } as never,
  })
  colleagueId = colleague.id
  editor = await asUser(editorDoc.id)
})

describe('user visibility', () => {
  it("shows a colleague's name but not their email or Kanidm subject", async () => {
    const seen = (await payload.findByID({
      collection: 'users',
      id: colleagueId,
      user: editor,
      overrideAccess: false,
    })) as unknown as Record<string, unknown>

    expect(seen.name).toBe('Karl Kollege')
    expect(seen.email).toBeUndefined()
    expect(seen.sub).toBeUndefined()
  })

  it('shows users their own email', async () => {
    const self = (await payload.findByID({
      collection: 'users',
      id: editor.id as string | number,
      user: editor,
      overrideAccess: false,
    })) as unknown as Record<string, unknown>

    expect(self.email).toBe('vis-editor@test.de')
  })

  it('shows anonymous visitors no users at all', async () => {
    await expect(payload.find({ collection: 'users', overrideAccess: false })).rejects.toThrow()
  })
})
