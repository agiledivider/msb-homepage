/**
 * PASSWORD_LOGIN=off (the server default): nobody gets into the CMS with email
 * and password, not even a user who has one, and the schema keeps the password
 * columns so switching back needs no migration.
 */
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.PASSWORD_LOGIN = 'off' // before the config loads (it is imported in beforeAll)

let payload: Payload

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  // A user with a password, as a dev backup restored onto a server would bring along.
  await payload.create({
    collection: 'users',
    data: { email: 'pw-off@test.de', password: 'test-password-123', name: 'Mit Passwort' } as never,
  })
})

afterAll(async () => {
  await payload?.destroy()
  delete process.env.PASSWORD_LOGIN
})

describe('password login switched off', () => {
  it('refuses email/password login, also with the right password', async () => {
    await expect(
      payload.login({ collection: 'users', data: { email: 'pw-off@test.de', password: 'test-password-123' } }),
    ).rejects.toThrow()
  })

  it('refuses "forgot password"', async () => {
    await expect(
      payload.forgotPassword({ collection: 'users', data: { email: 'pw-off@test.de' }, disableEmail: true }),
    ).rejects.toThrow()
  })

  it('keeps the password columns, so switching back needs no migration', async () => {
    const { rows } = (await payload.db.drizzle.run("select name from pragma_table_info('users')")) as unknown as {
      rows: { name: string }[]
    }
    const columns = rows.map((r) => r.name)
    expect(columns).toEqual(expect.arrayContaining(['email', 'hash', 'salt']))
  })
})
