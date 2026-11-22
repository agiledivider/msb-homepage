/**
 * S8.1: the admin backups view. Only admins get data; the backup API is faked
 * at the network boundary (injected fetch); the clock is injected.
 */
import { describe, expect, it } from 'vitest'
import {
  backupApiConfig,
  loadBackups,
  loadStatus,
  openDownload,
  STALE_AFTER_MS,
  startBackup,
} from '@/plugins/backups/load'

const NOW = new Date('2026-11-22T12:00:00Z')
const CONFIG = { url: 'http://backup:8081', token: 'api-token' }
const admin = { collection: 'users', id: 1, email: 'admin@test.de' }
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
          lastRun: { status: 'ok', at: '2026-11-21T02:31:00.000Z', by: null },
          running: null,
        },
        200,
        seen,
      ),
    )
    expect(out.kind).toBe('ok')
    if (out.kind !== 'ok') return
    expect(out.snapshots.map((s) => s.time)).toEqual(['2026-11-21T02:30:00.000Z', '2026-11-20T02:30:00.000Z'])
    expect(out.lastRun).toEqual({ status: 'ok', at: '2026-11-21T02:31:00.000Z', by: null })
    expect(out.running).toBeNull()
    expect(out.stale).toBe(false)
    expect(seen).toEqual([{ url: 'http://backup:8081/backups', token: 'api-token' }])
  })

  it.each([
    ['an editor', editor],
    ['nobody logged in', null],
    ['an API key (not a CMS user)', { collection: 'mcp-api-keys', id: 1 }],
  ])('gives %s nothing and never calls the backup API', async (_label, user) => {
    const seen: { url?: string }[] = []
    expect(await load(user, fakeFetch({ snapshots: [], lastRun: null, running: null }, 200, seen))).toEqual({
      kind: 'forbidden',
    })
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
    const out = await load(
      admin,
      fakeFetch({ snapshots: [snapshot(new Date(at).toISOString())], lastRun: null, running: null }),
    )
    expect(out.kind === 'ok' && out.stale).toBe(stale)
  })

  it('warns when there is no backup at all', async () => {
    const out = await load(admin, fakeFetch({ snapshots: [], lastRun: null, running: null }))
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

describe('startBackup (S8.5)', () => {
  type Seen = { url: string; method?: string; body?: string; token: string | null }
  const api = (status: number, body: unknown, seen: Seen[] = []) =>
    (async (url: string | URL | Request, init?: RequestInit) => {
      seen.push({
        url: String(url),
        method: init?.method,
        body: init?.body as string,
        token: new Headers(init?.headers).get('X-Backup-Token'),
      })
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    }) as typeof globalThis.fetch
  const logs: [string, string][] = []
  const start = (user: unknown, fetch: typeof globalThis.fetch) =>
    startBackup(user, { config: CONFIG, fetch, now: () => NOW, isAdmin, log: (l, m) => logs.push([l, m]) })

  it("starts a backup in the admin's name and logs who", async () => {
    const seen: Seen[] = []
    expect(await start(admin, api(202, { started: true }, seen))).toEqual({ kind: 'started' })
    expect(seen).toEqual([
      { url: 'http://backup:8081/backups', method: 'POST', body: '{"by":"admin@test.de"}', token: 'api-token' },
    ])
    expect(logs).toContainEqual(['info', 'backups: backup started from the CMS by admin@test.de'])
  })

  it('reports the backup that is already running', async () => {
    const running = { startedAt: '2026-11-22T03:30:00.000Z', by: null }
    expect(await start(admin, api(409, { error: 'x', running }))).toEqual({ kind: 'running', running })
  })

  it('never asks the backup service for an editor', async () => {
    const seen: Seen[] = []
    expect(await start(editor, api(202, {}, seen))).toEqual({ kind: 'forbidden' })
    expect(seen).toHaveLength(0)
  })

  it('is "unavailable" when the service fails', async () => {
    expect(await start(admin, api(502, { error: 'x' }))).toEqual({ kind: 'unavailable' })
  })
})

describe('loadStatus (S8.5)', () => {
  const status = (user: unknown, body: unknown, status = 200) =>
    loadStatus(user, {
      config: CONFIG,
      fetch: (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof globalThis.fetch,
      now: () => NOW,
      isAdmin,
      log: () => {},
    })

  it('gives an admin the running backup and the last run', async () => {
    const body = {
      running: { startedAt: '2026-11-22T11:59:00.000Z', by: 'admin@test.de' },
      lastRun: { status: 'failed', at: '2026-11-22T03:31:00.000Z', by: null },
    }
    expect(await status(admin, body)).toEqual({ kind: 'ok', ...body })
  })

  it('gives an editor nothing', async () => {
    expect(await status(editor, { running: null, lastRun: null })).toEqual({ kind: 'forbidden' })
  })

  it('is "unavailable" on an unexpected answer', async () => {
    expect(await status(admin, { running: 'yes' })).toEqual({ kind: 'unavailable' })
  })
})

describe('openDownload (S8.2)', () => {
  type Seen = { url: string; method?: string; body: unknown; token: string | null }
  const PASS = 'k7mq-x3pz-9cdr-wv4h-tn2e-fa8b'
  const api = (status: number, body: string, headers: Record<string, string> = {}, seen: Seen[] = []) =>
    (async (url: string | URL | Request, init?: RequestInit) => {
      seen.push({
        url: String(url),
        method: init?.method,
        body: JSON.parse(String(init?.body ?? 'null')),
        token: new Headers(init?.headers).get('X-Backup-Token'),
      })
      return new Response(body, { status, headers })
    }) as typeof globalThis.fetch
  const logs: [string, string][] = []
  const open = (user: unknown, id: string, fetch: typeof globalThis.fetch, passphrase: unknown = PASS) =>
    openDownload(user, id, passphrase, {
      config: CONFIG,
      fetch,
      now: () => NOW,
      isAdmin,
      log: (l: 'info' | 'error', m: string) => logs.push([l, m]),
    })
  const NAME = 'msb-backup-20261122T1329Z-7bf61efa.tar.gz.enc'

  it("asks for the backup encrypted with the passphrase, in the admin's name, and logs who", async () => {
    const seen: Seen[] = []
    const out = await open(
      admin,
      '7bf61efa',
      api(200, 'encrypted-bytes', { 'Content-Disposition': `attachment; filename="${NAME}"` }, seen),
    )
    expect(out.kind).toBe('ok')
    if (out.kind !== 'ok') return
    expect(out.filename).toBe(NAME)
    expect(await new Response(out.body).text()).toBe('encrypted-bytes')
    expect(seen).toEqual([
      {
        url: 'http://backup:8081/backups/7bf61efa/download',
        method: 'POST',
        body: { passphrase: PASS, by: 'admin@test.de' },
        token: 'api-token',
      },
    ])
    expect(logs).toContainEqual([
      'info',
      'backups: backup 7bf61efa downloaded (encrypted) from the CMS by admin@test.de',
    ])
    expect(logs.flat().join(' ')).not.toContain(PASS)
  })

  it.each([
    ['no passphrase', null],
    ['a short one', 'short'],
    ['one with spaces', 'aaaa bbbb cccc dddd eeee'],
  ])('refuses %s and never asks the backup service', async (_label, passphrase) => {
    const seen: Seen[] = []
    expect(await open(admin, '7bf61efa', api(200, 'x', {}, seen), passphrase)).toEqual({ kind: 'bad-passphrase' })
    expect(seen).toHaveLength(0)
  })

  it('falls back to a safe name when the service sends an odd one', async () => {
    const out = await open(
      admin,
      '7bf61efa',
      api(200, 'x', { 'Content-Disposition': 'attachment; filename="../x.sh"' }),
    )
    expect(out.kind === 'ok' && out.filename).toBe('msb-backup-7bf61efa.tar.gz.enc')
  })

  it.each([
    ['a path trick', '../status'],
    ['a query trick', '7bf61efa?x=1'],
    ['a non-hex id', 'latest'],
    ['too short', 'abc'],
  ])('never sends %s to the backup service', async (_label, id) => {
    const seen: Seen[] = []
    expect(await open(admin, id, api(200, 'x', {}, seen))).toEqual({ kind: 'not-found' })
    expect(seen).toHaveLength(0)
  })

  it('passes on "not found"', async () => {
    expect(await open(admin, 'deadbeef', api(404, '{}'))).toEqual({ kind: 'not-found' })
  })

  it('gives an editor nothing and never asks the backup service', async () => {
    const seen: Seen[] = []
    expect(await open(editor, '7bf61efa', api(200, 'x', {}, seen))).toEqual({ kind: 'forbidden' })
    expect(seen).toHaveLength(0)
  })
})
