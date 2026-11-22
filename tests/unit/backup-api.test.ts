/**
 * S8.1: the backup container's internal API lists the backups for the CMS.
 * restic and the scheduler's status file are faked; the HTTP server is real.
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { makeHandler, parseLastRun, parseSnapshots, tokenMatches } from '../../scripts/backup/backup-api.mjs'

const resticSnapshot = (over: Record<string, unknown> = {}) => ({
  id: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  short_id: 'a1b2c3d4',
  time: '2026-11-21T03:30:12.123456789+01:00',
  summary: { total_bytes_processed: 52_428_800 },
  ...over,
})

describe('parseSnapshots', () => {
  it('keeps id, short id, UTC time and size', () => {
    expect(parseSnapshots([resticSnapshot()])).toEqual([
      {
        id: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
        shortId: 'a1b2c3d4',
        time: '2026-11-21T02:30:12.123Z',
        sizeBytes: 52_428_800,
      },
    ])
  })

  it('sorts newest first', () => {
    const out = parseSnapshots([
      resticSnapshot({ id: 'old', time: '2026-11-01T03:30:00Z' }),
      resticSnapshot({ id: 'new', time: '2026-11-21T03:30:00Z' }),
    ])
    expect(out.map((s: { id: string }) => s.id)).toEqual(['new', 'old'])
  })

  it.each([
    ['no summary (restic < 0.17)', { summary: undefined }],
    ['a negative size', { summary: { total_bytes_processed: -1 } }],
    ['a size that is not a number', { summary: { total_bytes_processed: '12' } }],
  ])('has an unknown size for %s', (_label, over) => {
    expect(parseSnapshots([resticSnapshot(over)])[0].sizeBytes).toBeNull()
  })

  it('derives the short id when restic leaves it out', () => {
    expect(parseSnapshots([resticSnapshot({ short_id: undefined })])[0].shortId).toBe('a1b2c3d4')
  })

  it.each([
    ['not an array', { snapshots: [] }],
    ['an entry without id', [resticSnapshot({ id: undefined })]],
    ['an entry with a broken time', [resticSnapshot({ time: 'yesterday' })]],
  ])('refuses %s', (_label, json) => {
    expect(() => parseSnapshots(json)).toThrow()
  })
})

describe('parseLastRun', () => {
  it.each(['ok', 'failed'])('reads a %s run', (status) => {
    expect(parseLastRun(JSON.stringify({ status, at: '2026-11-21T02:31:00Z' }))).toEqual({
      status,
      at: '2026-11-21T02:31:00.000Z',
    })
  })

  it.each([
    ['broken JSON', '{'],
    ['an unknown status', '{"status":"maybe","at":"2026-11-21T02:31:00Z"}'],
    ['a missing time', '{"status":"ok"}'],
  ])('is unknown for %s', (_label, text) => {
    expect(parseLastRun(text)).toBeNull()
  })
})

describe('tokenMatches', () => {
  it.each([
    ['the right token', 'secret-token', true],
    ['a wrong token', 'secret-tokem', false],
    ['a prefix', 'secret', false],
    ['no token', undefined, false],
  ])('%s', (_label, given, ok) => {
    expect(tokenMatches(given, 'secret-token')).toBe(ok)
  })

  it('never matches when no token is configured', () => {
    expect(tokenMatches('', '')).toBe(false)
  })
})

describe('GET /backups', () => {
  let server: Server | undefined
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

  const start = async (deps: Partial<Parameters<typeof makeHandler>[0]> = {}) => {
    const logs: string[] = []
    server = createServer(
      makeHandler({
        token: 'secret-token',
        listSnapshots: async () => parseSnapshots([resticSnapshot()]),
        readLastRun: async () => ({ status: 'ok', at: '2026-11-21T02:31:00.000Z' }),
        log: (m: string) => logs.push(m),
        ...deps,
      }),
    )
    await new Promise<void>((done) => server?.listen(0, '127.0.0.1', done))
    const { port } = server.address() as AddressInfo
    const get = (path: string, token?: string) =>
      fetch(`http://127.0.0.1:${port}${path}`, { headers: token ? { 'X-Backup-Token': token } : {} })
    return { get, logs }
  }

  it('lists the backups and the last run for the right token', async () => {
    const { get } = await start()
    const res = await get('/backups', 'secret-token')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.snapshots).toHaveLength(1)
    expect(body.snapshots[0].shortId).toBe('a1b2c3d4')
    expect(body.lastRun).toEqual({ status: 'ok', at: '2026-11-21T02:31:00.000Z' })
  })

  it.each([['no token'], ['a wrong token']])('refuses %s with 401 and runs nothing', async (label) => {
    let listed = false
    const { get } = await start({
      listSnapshots: async () => {
        listed = true
        return []
      },
    })
    const res = await get('/backups', label === 'no token' ? undefined : 'nope')
    expect(res.status).toBe(401)
    expect(listed).toBe(false)
  })

  it('answers 502 without restic details when listing fails, and logs them', async () => {
    const { get, logs } = await start({
      listSnapshots: async () => {
        throw new Error('Fatal: wrong password or no key found')
      },
    })
    const res = await get('/backups', 'secret-token')
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('password')
    expect(logs.join('\n')).toContain('wrong password')
  })

  it('has nothing else, in particular no way to delete', async () => {
    const { get } = await start()
    expect((await get('/backups/x', 'secret-token')).status).toBe(404)
    expect((await get('/forget', 'secret-token')).status).toBe(404)
  })
})
