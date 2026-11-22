/**
 * S8.1: the backup container's internal API lists the backups for the CMS.
 * restic and the scheduler's status file are faked; the HTTP server is real.
 */
import { execFileSync } from 'node:child_process'
import { createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanBy,
  decryptFile,
  downloadName,
  encryptStream,
  makeHandler,
  PBKDF2_ITERATIONS,
  parseLastRestore,
  parseLastRun,
  parsePreview,
  parseRunning,
  parseSnapshots,
  tokenMatches,
  validPassphrase,
} from '../../scripts/backup/backup-api.mjs'

const PREVIEW = {
  integrity: 'ok' as const,
  compatible: true,
  differences: [] as string[],
  backup: { counts: { pages: 6, blog: 5, events: 238, media: 36, users: 4 }, mediaFiles: 269 },
  live: { counts: { pages: 7, blog: 6, events: 240, media: 38, users: 4 }, mediaFiles: 280 },
}

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
        beforeRestore: false,
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

  it('marks the safety backup a restore took', () => {
    expect(parseSnapshots([resticSnapshot({ tags: ['msb', 'before-restore'] })])[0].beforeRestore).toBe(true)
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
  it.each(['ok', 'failed'])('reads a nightly %s run', (status) => {
    expect(parseLastRun(JSON.stringify({ status, at: '2026-11-21T02:31:00Z' }))).toEqual({
      status,
      at: '2026-11-21T02:31:00.000Z',
      by: null,
    })
  })

  it('keeps who started a manual run', () => {
    expect(parseLastRun('{"status":"ok","at":"2026-11-22T13:00:00Z","by":"admin@test.de"}')?.by).toBe('admin@test.de')
  })

  it.each([
    ['broken JSON', '{'],
    ['an unknown status', '{"status":"maybe","at":"2026-11-21T02:31:00Z"}'],
    ['a missing time', '{"status":"ok"}'],
  ])('is unknown for %s', (_label, text) => {
    expect(parseLastRun(text)).toBeNull()
  })
})

describe('cleanBy', () => {
  it.each([
    ['an email', 'admin@test.de', 'admin@test.de'],
    ['quotes and spaces (would break the JSON the shell writes)', 'a"b c\\d@x.de', 'abcd@x.de'],
    ['nothing usable', '"" ', null],
    ['not a string', 42, null],
  ])('%s', (_label, given, out) => {
    expect(cleanBy(given)).toBe(out)
  })
})

describe('parseRunning', () => {
  it('reads start time and who', () => {
    expect(parseRunning('{"startedAt":"2026-11-22T13:00:00Z","by":"admin@test.de"}', 'x')).toEqual({
      startedAt: '2026-11-22T13:00:00.000Z',
      by: 'admin@test.de',
      kind: 'backup',
      snapshot: null,
    })
  })

  it('tells a restore apart, with its snapshot', () => {
    expect(
      parseRunning('{"startedAt":"2026-11-22T13:00:00Z","by":null,"kind":"restore","snapshot":"7bf61efa"}', 'x'),
    ).toEqual({ startedAt: '2026-11-22T13:00:00.000Z', by: null, kind: 'restore', snapshot: '7bf61efa' })
  })

  it('still means "running" while the info is being written', () => {
    expect(parseRunning('', '2026-11-22T13:00:01.000Z')).toEqual({
      startedAt: '2026-11-22T13:00:01.000Z',
      by: null,
      kind: 'backup',
      snapshot: null,
    })
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
        readLastRun: async () => ({ status: 'ok', at: '2026-11-21T02:31:00.000Z', by: null }),
        readRunning: async () => null,
        startBackup: () => 'started',
        dumpSnapshot: () => ({ stream: Readable.from([]), cancel: () => {} }),
        readLastRestore: async () => null,
        inspectSnapshot: async () => PREVIEW,
        startRestore: () => 'started' as const,
        log: (m: string) => logs.push(m),
        ...deps,
      }),
    )
    await new Promise<void>((done) => server?.listen(0, '127.0.0.1', done))
    const { port } = server.address() as AddressInfo
    const get = (path: string, token?: string) =>
      fetch(`http://127.0.0.1:${port}${path}`, { headers: token ? { 'X-Backup-Token': token } : {} })
    const post = (path: string, body: string, token = 'secret-token') =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { 'X-Backup-Token': token, 'Content-Type': 'application/json' },
        body,
      })
    return { get, post, logs }
  }

  it('lists the backups and the last run for the right token', async () => {
    const { get } = await start()
    const res = await get('/backups', 'secret-token')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.snapshots).toHaveLength(1)
    expect(body.snapshots[0].shortId).toBe('a1b2c3d4')
    expect(body.lastRun).toEqual({ status: 'ok', at: '2026-11-21T02:31:00.000Z', by: null })
    expect(body.running).toBeNull()
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

  it('answers /status with the last run and a running backup, without asking restic', async () => {
    let listed = false
    const { get } = await start({
      listSnapshots: async () => {
        listed = true
        return []
      },
      readRunning: async () => ({
        startedAt: '2026-11-22T13:00:00.000Z',
        by: 'admin@test.de',
        kind: 'backup' as const,
        snapshot: null,
      }),
    })
    const body = await (await get('/status', 'secret-token')).json()
    expect(body.running).toEqual({
      startedAt: '2026-11-22T13:00:00.000Z',
      by: 'admin@test.de',
      kind: 'backup',
      snapshot: null,
    })
    expect(listed).toBe(false)
  })
})

describe('POST /backups (S8.5)', () => {
  let server: Server | undefined
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

  const start = async (
    running: { startedAt: string; by: string | null } | null,
    startResult: 'started' | 'running' = 'started',
  ) => {
    const started: (string | null)[] = []
    const logs: string[] = []
    server = createServer(
      makeHandler({
        token: 'secret-token',
        listSnapshots: async () => [],
        readLastRun: async () => null,
        readRunning: async () => running as never,
        startBackup: (by: string | null) => {
          started.push(by)
          return startResult
        },
        dumpSnapshot: () => ({ stream: Readable.from([]), cancel: () => {} }),
        readLastRestore: async () => null,
        inspectSnapshot: async () => PREVIEW,
        startRestore: () => 'started' as const,
        log: (m: string) => logs.push(m),
      }),
    )
    await new Promise<void>((done) => server?.listen(0, '127.0.0.1', done))
    const { port } = server.address() as AddressInfo
    const post = (body: string, token = 'secret-token') =>
      fetch(`http://127.0.0.1:${port}/backups`, {
        method: 'POST',
        headers: { 'X-Backup-Token': token, 'Content-Type': 'application/json' },
        body,
      })
    return { post, started, logs }
  }

  it('starts a backup, passes on and logs who asked', async () => {
    const { post, started, logs } = await start(null)
    const res = await post('{"by":"admin@test.de"}')
    expect(res.status).toBe(202)
    expect(started).toEqual(['admin@test.de'])
    expect(logs.join('\n')).toContain('backup started by admin@test.de')
  })

  it('starts no second backup while one runs', async () => {
    const running = { startedAt: '2026-11-22T03:30:00.000Z', by: null }
    const { post, started } = await start(running)
    const res = await post('{"by":"admin@test.de"}')
    expect(res.status).toBe(409)
    expect((await res.json()).running).toEqual(running)
    expect(started).toEqual([])
  })

  it('answers 409 when the start itself finds one running', async () => {
    const { post } = await start(null, 'running')
    expect((await post('{}')).status).toBe(409)
  })

  it('refuses a wrong token and starts nothing', async () => {
    const { post, started } = await start(null)
    expect((await post('{}', 'nope')).status).toBe(401)
    expect(started).toEqual([])
  })

  it.each([
    ['not JSON', 'by=admin'],
    ['a body over 4 KB', JSON.stringify({ by: 'x'.repeat(5000) })],
  ])('refuses %s and starts nothing', async (_label, body) => {
    const { post, started } = await start(null)
    expect((await post(body)).status).toBe(400)
    expect(started).toEqual([])
  })
})

describe('downloadName', () => {
  it('names the encrypted file by UTC time and short id', () => {
    expect(downloadName({ time: '2026-11-22T13:29:46.123Z', shortId: '7bf61efa' })).toBe(
      'msb-backup-20261122T1329Z-7bf61efa.tar.gz.enc',
    )
  })
})

describe('validPassphrase', () => {
  it.each([
    ['a generated one', 'k7mq-x3pz-9cdr-wv4h-tn2e-fa8b', true],
    ['19 characters', 'a'.repeat(19), false],
    ['201 characters', 'a'.repeat(201), false],
    ['a space', 'abcdefghij klmnopqrstu', false],
    ['not a string', 123456789012345, false],
  ])('%s → %s', (_label, v, ok) => {
    expect(validPassphrase(v)).toBe(ok)
  })
})

/** Decrypt OpenSSL `enc` (AES-256-CBC, PBKDF2-SHA256) independently of the code under test. */
const decrypt = (data: Buffer, passphrase: string, iterations = PBKDF2_ITERATIONS) => {
  expect(data.subarray(0, 8).toString()).toBe('Salted__')
  const key = pbkdf2Sync(passphrase, data.subarray(8, 16), iterations, 48, 'sha256')
  const d = createDecipheriv('aes-256-cbc', key.subarray(0, 32), key.subarray(32, 48))
  return Buffer.concat([d.update(data.subarray(16)), d.final()])
}
const hasOpenssl = (() => {
  try {
    execFileSync('openssl', ['version'])
    return true
  } catch {
    return false
  }
})()

describe('encryptStream', () => {
  const PASS = 'k7mq-x3pz-9cdr-wv4h-tn2e-fa8b'
  const encrypt = async (text: string, pass = PASS, iterations = 1000) =>
    Buffer.concat(await (await encryptStream(Readable.from([Buffer.from(text)]), pass, iterations)).toArray())

  it('round-trips with the same passphrase', async () => {
    expect(decrypt(await encrypt('database and media', PASS, 1000), PASS, 1000).toString()).toBe('database and media')
  })

  it('does not open with another passphrase', async () => {
    const data = await encrypt('secret')
    expect(() => decrypt(data, 'another-passphrase-xyz', 1000)).toThrow()
  })

  it('uses a fresh salt every time', async () => {
    expect((await encrypt('same')).subarray(8, 16)).not.toEqual((await encrypt('same')).subarray(8, 16))
  })

  it.runIf(hasOpenssl)('opens with the openssl command shown to the admin', async () => {
    const data = await encrypt('opens with openssl', PASS, PBKDF2_ITERATIONS)
    const out = execFileSync(
      'openssl',
      [
        'enc',
        '-d',
        '-aes-256-cbc',
        '-pbkdf2',
        '-iter',
        String(PBKDF2_ITERATIONS),
        '-md',
        'sha256',
        '-pass',
        `pass:${PASS}`,
      ],
      { input: data },
    )
    expect(out.toString()).toBe('opens with openssl')
  })
})

describe('POST /backups/<id>/download (S8.2)', () => {
  let server: Server | undefined
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

  const PASS = 'k7mq-x3pz-9cdr-wv4h-tn2e-fa8b'
  const SNAP = parseSnapshots([resticSnapshot()])[0]
  const start = async () => {
    const dumped: string[] = []
    const logs: string[] = []
    server = createServer(
      makeHandler({
        token: 'secret-token',
        listSnapshots: async () => [SNAP],
        readLastRun: async () => null,
        readRunning: async () => null,
        startBackup: () => 'started',
        dumpSnapshot: (id: string) => {
          dumped.push(id)
          return { stream: Readable.from([Buffer.from('tar-gz-bytes')]), cancel: () => {} }
        },
        readLastRestore: async () => null,
        inspectSnapshot: async () => PREVIEW,
        startRestore: () => 'started' as const,
        log: (m: string) => logs.push(m),
      }),
    )
    await new Promise<void>((done) => server?.listen(0, '127.0.0.1', done))
    const { port } = server.address() as AddressInfo
    const post = (path: string, body: unknown, token = 'secret-token') =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { 'X-Backup-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    return { post, dumped, logs }
  }

  it.each([
    ['the full id', SNAP.id],
    ['the short id', SNAP.shortId],
  ])('streams the backup encrypted with the passphrase by %s, and logs who', async (_label, id) => {
    const { post, dumped, logs } = await start()
    const res = await post(`/backups/${id}/download`, { passphrase: PASS, by: 'admin@test.de' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="${downloadName(SNAP)}"`)
    const data = Buffer.from(await res.arrayBuffer())
    expect(data.includes(Buffer.from('tar-gz-bytes'))).toBe(false)
    expect(decrypt(data, PASS).toString()).toBe('tar-gz-bytes')
    expect(dumped).toEqual([SNAP.id])
    expect(logs.join('\n')).toContain(`backup ${SNAP.shortId} downloaded (encrypted) by admin@test.de`)
  })

  it.each([
    ['no passphrase', {}],
    ['a short passphrase', { passphrase: 'short' }],
  ])('refuses %s, so there is no unencrypted download', async (_label, body) => {
    const { post, dumped } = await start()
    expect((await post(`/backups/${SNAP.id}/download`, body)).status).toBe(400)
    expect(dumped).toEqual([])
  })

  it('has no GET download any more', async () => {
    const { dumped } = await start()
    const { port } = (server as Server).address() as AddressInfo
    const res = await fetch(`http://127.0.0.1:${port}/backups/${SNAP.id}/download`, {
      headers: { 'X-Backup-Token': 'secret-token' },
    })
    expect(res.status).toBe(404)
    expect(dumped).toEqual([])
  })

  it('answers 404 for a backup that does not exist, without dumping', async () => {
    const { post, dumped } = await start()
    expect((await post('/backups/deadbeef/download', { passphrase: PASS })).status).toBe(404)
    expect(dumped).toEqual([])
  })

  it.each([
    ['a path trick', '/backups/..%2F..%2Fetc/download'],
    ['a non-hex id', '/backups/latest/download'],
  ])('answers 404 for %s', async (_label, path) => {
    const { post, dumped } = await start()
    expect((await post(path, { passphrase: PASS })).status).toBe(404)
    expect(dumped).toEqual([])
  })

  it('refuses a wrong token', async () => {
    const { post, dumped } = await start()
    expect((await post(`/backups/${SNAP.id}/download`, { passphrase: PASS }, 'nope')).status).toBe(401)
    expect(dumped).toEqual([])
  })
})

describe('parseLastRestore', () => {
  it('reads a finished restore', () => {
    const text =
      '{"status":"ok","at":"2026-11-22T14:00:00Z","by":"admin@test.de","snapshot":"7bf61efa","safety":"a1b2c3d4","code":"restored","message":"restored"}'
    expect(parseLastRestore(text)).toEqual({
      status: 'ok',
      at: '2026-11-22T14:00:00.000Z',
      by: 'admin@test.de',
      source: 'backup',
      snapshot: '7bf61efa',
      safety: 'a1b2c3d4',
      code: 'restored',
      message: 'restored',
    })
  })

  it('keeps a failure before the safety backup without one', () => {
    const out = parseLastRestore(
      '{"status":"failed","at":"2026-11-22T14:00:00Z","by":null,"snapshot":"7bf61efa","safety":null,"code":"other-version","message":"the backup is from another version of the site (other migrations); nothing changed"}',
    )
    expect(out?.safety).toBeNull()
    expect(out?.code).toBe('other-version')
    expect(out?.message).toContain('nothing changed')
  })

  it.each([
    ['broken JSON', '{'],
    ['no snapshot', '{"status":"ok","at":"2026-11-22T14:00:00Z"}'],
  ])('is unknown for %s', (_label, text) => {
    expect(parseLastRestore(text)).toBeNull()
  })
})

it('turns an unknown outcome code into "unknown"', () => {
  expect(
    parseLastRestore('{"status":"failed","at":"2026-11-22T14:00:00Z","snapshot":"7bf61efa","code":"<script>"}')?.code,
  ).toBe('unknown')
})

describe('parsePreview', () => {
  it('reads what inspect prints', () => {
    expect(parsePreview(JSON.stringify(PREVIEW))).toEqual(PREVIEW)
  })

  it('names the tables whose structure differs, and only plain table names', () => {
    const out = parsePreview(
      JSON.stringify({ ...PREVIEW, compatible: false, differences: ['pages', 'pages_blocks_press', '<script>'] }),
    )
    expect(out.differences).toEqual(['pages', 'pages_blocks_press'])
  })

  it('has no differences when inspect names none (older backup service)', () => {
    const { differences: _, ...old } = PREVIEW
    expect(parsePreview(JSON.stringify(old)).differences).toEqual([])
  })

  it('keeps a missing table as unknown', () => {
    const out = parsePreview(
      JSON.stringify({ ...PREVIEW, backup: { counts: { pages: 1, blog: null }, mediaFiles: 0 } }),
    )
    expect(out.backup.counts).toEqual({ pages: 1, blog: null, events: null, media: null, users: null })
  })

  it.each([
    ['no integrity', { ...PREVIEW, integrity: undefined }],
    ['no media count', { ...PREVIEW, live: { counts: {} } }],
  ])('refuses %s', (_label, v) => {
    expect(() => parsePreview(JSON.stringify(v))).toThrow()
  })
})

describe('preview and restore (S8.3)', () => {
  let server: Server | undefined
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

  const SNAP = parseSnapshots([resticSnapshot()])[0]
  const start = async (running: unknown = null) => {
    const restored: [string, string | null][] = []
    const inspected: string[] = []
    const logs: string[] = []
    server = createServer(
      makeHandler({
        token: 'secret-token',
        listSnapshots: async () => [SNAP],
        readLastRun: async () => null,
        readRunning: async () => running as never,
        startBackup: () => 'started' as const,
        dumpSnapshot: () => ({ stream: Readable.from([]), cancel: () => {} }),
        readLastRestore: async () => null,
        inspectSnapshot: async (id: string) => {
          inspected.push(id)
          return PREVIEW
        },
        startRestore: (id: string, by: string | null) => {
          restored.push([id, by])
          return 'started' as const
        },
        log: (m: string) => logs.push(m),
      }),
    )
    await new Promise<void>((done) => server?.listen(0, '127.0.0.1', done))
    const { port } = (server as Server).address() as AddressInfo
    const call = (method: string, path: string, body?: unknown, token = 'secret-token') =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: { 'X-Backup-Token': token, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    return { call, restored, inspected, logs }
  }

  it('previews a backup next to the live site', async () => {
    const { call, inspected } = await start()
    const res = await call('GET', `/backups/${SNAP.shortId}/preview`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ snapshot: SNAP, ...PREVIEW })
    expect(inspected).toEqual([SNAP.id])
  })

  it('previews nothing for an unknown backup', async () => {
    const { call, inspected } = await start()
    expect((await call('GET', '/backups/deadbeef/preview')).status).toBe(404)
    expect(inspected).toEqual([])
  })

  it('starts a restore when the short id is confirmed, and logs who', async () => {
    const { call, restored, logs } = await start()
    const res = await call('POST', `/backups/${SNAP.shortId}/restore`, { confirm: SNAP.shortId, by: 'admin@test.de' })
    expect(res.status).toBe(202)
    expect(restored).toEqual([[SNAP.id, 'admin@test.de']])
    expect(logs.join('\n')).toContain(`restore of ${SNAP.shortId} started by admin@test.de`)
  })

  it.each([
    ['no confirmation', {}],
    ['the wrong backup', { confirm: 'deadbeef' }],
    ['the date instead of the id', { confirm: '22.11.2026' }],
  ])('refuses %s and restores nothing', async (_label, body) => {
    const { call, restored } = await start()
    expect((await call('POST', `/backups/${SNAP.shortId}/restore`, body)).status).toBe(400)
    expect(restored).toEqual([])
  })

  it('restores nothing while a backup runs', async () => {
    const running = { startedAt: '2026-11-22T03:30:00.000Z', by: null, kind: 'backup', snapshot: null }
    const { call, restored } = await start(running)
    const res = await call('POST', `/backups/${SNAP.shortId}/restore`, { confirm: SNAP.shortId })
    expect(res.status).toBe(409)
    expect(restored).toEqual([])
  })

  it('refuses a wrong token', async () => {
    const { call, restored } = await start()
    expect((await call('POST', `/backups/${SNAP.shortId}/restore`, { confirm: SNAP.shortId }, 'nope')).status).toBe(401)
    expect(restored).toEqual([])
  })
})

describe('decryptFile (S8.4)', () => {
  const PASS = 'k7mq-x3pz-9cdr-wv4h-tn2e-fa8b'
  const dir = mkdtempSync(join(tmpdir(), 'msb-decrypt-'))
  const encrypted = async (text: string) => {
    const file = join(dir, `${Math.random()}.enc`)
    writeFileSync(
      file,
      Buffer.concat(await (await encryptStream(Readable.from([Buffer.from(text)]), PASS, 1000)).toArray()),
    )
    return file
  }

  it('opens a download with its password', async () => {
    const out = join(dir, 'ok.tar.gz')
    expect(await decryptFile(await encrypted('the whole site'), out, PASS, 1000)).toBe('ok')
    expect(readFileSync(out, 'utf8')).toBe('the whole site')
  })

  it('says "wrong password" and leaves nothing behind', async () => {
    const out = join(dir, 'wrong.tar.gz')
    expect(await decryptFile(await encrypted('the whole site'), out, 'another-passphrase-xyz', 1000)).toBe(
      'wrong-password',
    )
    expect(() => readFileSync(out)).toThrow()
  })

  it('says "not a backup" for a file without the OpenSSL header', async () => {
    const file = join(dir, 'plain.tar.gz')
    writeFileSync(file, 'just some file')
    expect(await decryptFile(file, join(dir, 'x'), PASS, 1000)).toBe('not-a-backup')
  })
})

describe('uploads (S8.4)', () => {
  let server: Server | undefined
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

  const start = async (opts: { running?: unknown; check?: string; ready?: boolean; tooLarge?: boolean } = {}) => {
    const calls: string[] = []
    server = createServer(
      makeHandler({
        token: 'secret-token',
        listSnapshots: async () => [],
        readLastRun: async () => null,
        readRunning: async () => (opts.running ?? null) as never,
        startBackup: () => 'started' as const,
        dumpSnapshot: () => ({ stream: Readable.from([]), cancel: () => {} }),
        readLastRestore: async () => null,
        inspectSnapshot: async () => PREVIEW,
        startRestore: () => 'started' as const,
        uploads: {
          receive: async (body: Readable) => {
            const size = Buffer.concat(await body.toArray()).length
            calls.push(`receive ${size}`)
            return opts.tooLarge ? { tooLarge: true as const } : { uploadId: 'a1b2c3d4' }
          },
          check: async (id: string, passphrase: string) => {
            calls.push(`check ${id} ${passphrase}`)
            const kind = opts.check ?? 'ok'
            return (kind === 'ok' ? { kind, preview: PREVIEW } : { kind }) as never
          },
          ready: async () => opts.ready ?? true,
          restore: (id: string, by: string | null) => {
            calls.push(`restore ${id} ${by}`)
            return 'started' as const
          },
          discard: async (id: string) => {
            calls.push(`discard ${id}`)
          },
        },
        log: () => {},
      }),
    )
    await new Promise<void>((done) => server?.listen(0, '127.0.0.1', done))
    const { port } = (server as Server).address() as AddressInfo
    const call = (method: string, path: string, body?: string, token = 'secret-token') =>
      fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'X-Backup-Token': token }, body })
    return { call, calls }
  }
  const PASS = 'k7mq-x3pz-9cdr-wv4h-tn2e-fa8b'

  it('takes an upload and names it', async () => {
    const { call, calls } = await start()
    const res = await call('POST', '/uploads', 'x'.repeat(1000))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ uploadId: 'a1b2c3d4' })
    expect(calls).toEqual(['receive 1000'])
  })

  it('refuses an upload that is too large', async () => {
    const { call } = await start({ tooLarge: true })
    expect((await call('POST', '/uploads', 'x')).status).toBe(413)
  })

  it('takes no upload while a backup or restore runs', async () => {
    const { call, calls } = await start({ running: { kind: 'restore' } })
    expect((await call('POST', '/uploads', 'x')).status).toBe(409)
    expect(calls).toEqual([])
  })

  it('checks an upload with its password and previews it', async () => {
    const { call, calls } = await start()
    const res = await call('POST', '/uploads/a1b2c3d4/check', JSON.stringify({ passphrase: PASS }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ uploadId: 'a1b2c3d4', ...PREVIEW })
    expect(calls).toEqual([`check a1b2c3d4 ${PASS}`])
  })

  it.each([['wrong-password'], ['not-a-backup']])('answers 422 %s', async (code) => {
    const { call } = await start({ check: code })
    const res = await call('POST', '/uploads/a1b2c3d4/check', JSON.stringify({ passphrase: PASS }))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ code })
  })

  it('needs a password to check', async () => {
    const { call, calls } = await start()
    expect((await call('POST', '/uploads/a1b2c3d4/check', '{}')).status).toBe(400)
    expect(calls).toEqual([])
  })

  it('restores a checked upload when its id is confirmed', async () => {
    const { call, calls } = await start()
    const res = await call(
      'POST',
      '/uploads/a1b2c3d4/restore',
      JSON.stringify({ confirm: 'a1b2c3d4', by: 'admin@test.de' }),
    )
    expect(res.status).toBe(202)
    expect(calls).toEqual(['restore a1b2c3d4 admin@test.de'])
  })

  it.each([
    ['no confirmation', {}, 400],
    ['another id', { confirm: 'deadbeef' }, 400],
  ])('restores nothing with %s', async (_label, body, status) => {
    const { call, calls } = await start()
    expect((await call('POST', '/uploads/a1b2c3d4/restore', JSON.stringify(body))).status).toBe(status)
    expect(calls).toEqual([])
  })

  it('restores nothing that was not checked', async () => {
    const { call, calls } = await start({ ready: false })
    expect((await call('POST', '/uploads/a1b2c3d4/restore', JSON.stringify({ confirm: 'a1b2c3d4' }))).status).toBe(404)
    expect(calls).toEqual([])
  })

  it('throws an upload away', async () => {
    const { call, calls } = await start()
    expect((await call('DELETE', '/uploads/a1b2c3d4')).status).toBe(204)
    expect(calls).toEqual(['discard a1b2c3d4'])
  })

  it.each([
    ['/uploads/../etc'],
    ['/uploads/A1B2C3D4/check'],
    ['/uploads/a1b2c3d4e5/check'],
  ])('knows no %s', async (path) => {
    const { call, calls } = await start()
    expect((await call('POST', path, JSON.stringify({ passphrase: PASS }))).status).toBe(404)
    expect(calls).toEqual([])
  })

  it('refuses a wrong token', async () => {
    const { call, calls } = await start()
    expect((await call('POST', '/uploads', 'x', 'nope')).status).toBe(401)
    expect(calls).toEqual([])
  })
})
