/**
 * S8.1: the admin backups view. Only admins get data; the backup API is faked
 * at the network boundary (injected fetch); the clock is injected.
 */
import { describe, expect, it } from 'vitest'
import { backupApiConfig, loadBackups, STALE_AFTER_MS } from '@/plugins/backups/load'

const NOW = new Date('2026-11-22T12:00:00Z')
const CONFIG = { url: 'http://backup:8081', token: 'api-token' }
const admin = { collection: 'users', id: 1 }
const editor = { collection: 'users', id: 2 }
const isAdmin = (u: unknown) => (u as { id?: number } | null)?.id === 1

const snapshot = (time: string, over: Record<string, unknown> = {}) => ({
  id: `id-${time}`,
  shortId: time.slice(0, 8),
  time,
  sizeBytes: 1000,
  ...over,
})

const fakeFetch =
  (body: unknown, status = 200, seen: { url?: string; token?: string | null }[] = []) =>
  async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), token: new Headers(init?.headers).get('X-Backup-Token') })
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }

const load = (user: unknown, fetch: typeof globalThis.fetch, config: typeof CONFIG | null = CONFIG) =>
  loadBackups(user, { config, fetch, now: () => NOW, isAdmin, log: () => {} })

describe('loadBackups', () => {
  it('gives an admin the backups, newest first, with the last run', async () => {
    const seen: { url?: string; token?: string | null }[] = []
    const out = await load(
      admin,
      fakeFetch(
        {
          snapshots: [snapshot('2026-11-21T02:30:00.000Z'), snapshot('2026-11-20T02:30:00.000Z')],
          lastRun: { status: 'ok', at: '2026-11-21T02:31:00.000Z' },
        },
        200,
        seen,
      ),
    )
    expect(out.kind).toBe('ok')
    if (out.kind !== 'ok') return
    expect(out.snapshots.map((s) => s.time)).toEqual(['2026-11-21T02:30:00.000Z', '2026-11-20T02:30:00.000Z'])
    expect(out.lastRun).toEqual({ status: 'ok', at: '2026-11-21T02:31:00.000Z' })
    expect(out.stale).toBe(false)
    expect(seen).toEqual([{ url: 'http://backup:8081/backups', token: 'api-token' }])
  })

  it.each([
    ['an editor', editor],
    ['nobody logged in', null],
    ['an API key (not a CMS user)', { collection: 'mcp-api-keys', id: 1 }],
  ])('gives %s nothing and never calls the backup API', async (_label, user) => {
    const seen: { url?: string }[] = []
    expect(await load(user, fakeFetch({ snapshots: [], lastRun: null }, 200, seen))).toEqual({ kind: 'forbidden' })
    expect(seen).toHaveLength(0)
  })

  it('says when the backup API is not configured', async () => {
    expect(await load(admin, fakeFetch({}), null)).toEqual({ kind: 'not-configured' })
  })

  it.each([
    ['an error status', fakeFetch({ error: 'x' }, 502)],
    ['an unexpected answer', fakeFetch({ snapshots: 'nope' })],
    [
      'a network failure',
      async () => {
        throw new TypeError('fetch failed')
      },
    ],
  ])('is "unavailable" on %s', async (_label, fetch) => {
    expect(await load(admin, fetch as typeof globalThis.fetch)).toEqual({ kind: 'unavailable' })
  })

  it.each([
    ['newest backup just inside the limit', NOW.getTime() - STALE_AFTER_MS + 60_000, false],
    ['newest backup just past the limit', NOW.getTime() - STALE_AFTER_MS - 60_000, true],
  ])('%s → stale: %s', async (_label, at, stale) => {
    const out = await load(admin, fakeFetch({ snapshots: [snapshot(new Date(at).toISOString())], lastRun: null }))
    expect(out.kind === 'ok' && out.stale).toBe(stale)
  })

  it('warns when there is no backup at all', async () => {
    const out = await load(admin, fakeFetch({ snapshots: [], lastRun: null }))
    expect(out.kind === 'ok' && out.stale).toBe(true)
  })

  it('is 36 hours, i.e. a day and a half', () => {
    expect(STALE_AFTER_MS).toBe(36 * 60 * 60 * 1000)
  })
})

describe('backupApiConfig', () => {
  it('needs both URL and token', () => {
    expect(backupApiConfig({ BACKUP_API_URL: 'http://backup:8081', BACKUP_API_TOKEN: 't' })).toEqual({
      url: 'http://backup:8081',
      token: 't',
    })
    expect(backupApiConfig({ BACKUP_API_URL: 'http://backup:8081' })).toBeNull()
    expect(backupApiConfig({ BACKUP_API_TOKEN: 't' })).toBeNull()
  })

  it('drops a trailing slash from the URL', () => {
    expect(backupApiConfig({ BACKUP_API_URL: 'http://backup:8081/', BACKUP_API_TOKEN: 't' })?.url).toBe(
      'http://backup:8081',
    )
  })
})
