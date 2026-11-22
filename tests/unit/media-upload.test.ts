/**
 * Claude's media upload: file type check, file names, and the SSRF-guarded
 * downloader (Tier A, no Payload, no network: the transport is faked).
 */
import type { LookupAddress } from 'node:dns'
import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { type FetchDeps, FetchRefused, fetchPublicFile, isPublicAddress } from '@/plugins/mcp/fetchPublicFile'
import { safeFileName, sniffType } from '@/plugins/mcp/mediaFile'

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))

describe('sniffType', () => {
  it.each([
    ['JPEG', bytes([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
    ['PNG', bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), 'image/png'],
    ['GIF', bytes('GIF89a', [0]), 'image/gif'],
    ['WebP', bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '), 'image/webp'],
    ['PDF', bytes('%PDF-1.7'), 'application/pdf'],
  ])('accepts %s by its bytes', (_name, file, mime) => {
    expect(sniffType(file)?.mimeType).toBe(mime)
  })

  it.each([
    ['SVG', bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['HTML named .png', bytes('<!doctype html><script>')],
    ['RIFF that is not WebP', bytes('RIFF', [0, 0, 0, 0], 'WAVEfmt ')],
    ['empty', bytes()],
  ])('refuses %s', (_name, file) => {
    expect(sniffType(file)).toBeNull()
  })
})

describe('safeFileName', () => {
  it.each([
    ['../../etc/Mein Foto.PNG', 'png', 'mein-foto.png'],
    ['/uploads/Lötkurs März.jpeg', 'jpg', 'lotkurs-marz.jpg'],
    ['flyer.svg', 'pdf', 'flyer.pdf'],
    [undefined, 'webp', 'claude-upload.webp'],
    ['...', 'gif', 'claude-upload.gif'],
  ])('%s → %s', (wanted, ext, expected) => {
    expect(safeFileName(wanted, ext)).toBe(expected)
  })
})

describe('isPublicAddress', () => {
  it.each(['93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946', '::ffff:93.184.216.34'])('public: %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(true)
  })

  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.22.0.2', // a Docker network, like the CMS's own
    '192.168.178.1',
    '169.254.169.254', // cloud metadata
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    'not-an-ip',
  ])('not public: %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(false)
  })
})

/**
 * A fake https transport that behaves like Node's: it resolves the host through
 * the `lookup` option it is given (the guard under test) and only "connects"
 * when that succeeds. `sites` maps host → address and response.
 */
type Site = { address: string; status?: number; headers?: Record<string, string>; body?: Uint8Array }
const fakeNet = (sites: Record<string, Site>): FetchDeps & { connected: string[] } => {
  const connected: string[] = []
  return {
    connected,
    lookup: (hostname, _opts, cb) => {
      const site = sites[hostname]
      if (!site) return cb(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }), [])
      cb(null, [{ address: site.address, family: site.address.includes(':') ? 6 : 4 } as LookupAddress])
    },
    get: (url, options, onResponse) => {
      const listeners: ((err: Error) => void)[] = []
      const fail = (err: Error) =>
        queueMicrotask(() => {
          for (const l of listeners) l(err)
        })
      const lookup = options.lookup as unknown as (h: string, o: object, cb: (err: Error | null) => void) => void
      lookup(url.hostname, { all: false }, (err) => {
        if (err) return fail(err)
        connected.push(url.href)
        const site = sites[url.hostname]
        const res = Object.assign(Readable.from(site.body ? [Buffer.from(site.body)] : []), {
          statusCode: site.status ?? 200,
          headers: site.headers ?? {},
        })
        queueMicrotask(() => onResponse(res as never))
      })
      return { on: (_e: 'error', l: (err: Error) => void) => listeners.push(l), destroy: () => {} }
    },
  }
}

const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

describe('fetchPublicFile', () => {
  it('downloads from a public https host', async () => {
    const net = fakeNet({ 'img.example.org': { address: '93.184.216.34', body: PNG } })

    expect(await fetchPublicFile('https://img.example.org/a.png', 1000, net)).toEqual(PNG)
  })

  it.each([
    ['plain http', 'http://img.example.org/a.png'],
    ['another port', 'https://img.example.org:8443/a.png'],
    ['credentials', 'https://user:pw@img.example.org/a.png'],
    ['a private IP literal', 'https://192.168.178.1/a.png'],
    ['an IPv6 loopback literal', 'https://[::1]/a.png'],
    ['localhost', 'https://localhost/a.png'],
    ['garbage', 'not a url'],
  ])('refuses %s without connecting', async (_name, url) => {
    const net = fakeNet({ 'img.example.org': { address: '93.184.216.34', body: PNG } })

    await expect(fetchPublicFile(url, 1000, net)).rejects.toBeInstanceOf(FetchRefused)
    expect(net.connected).toEqual([])
  })

  it('refuses a host name that resolves to the internal network', async () => {
    const net = fakeNet({ 'evil.example.org': { address: '172.22.0.2', body: PNG } })

    await expect(fetchPublicFile('https://evil.example.org/x.png', 1000, net)).rejects.toThrow(/non-public/)
    expect(net.connected).toEqual([])
  })

  it('refuses a redirect to an internal address', async () => {
    const net = fakeNet({
      'img.example.org': {
        address: '93.184.216.34',
        status: 302,
        headers: { location: 'https://inside.example.org/' },
      },
      'inside.example.org': { address: '10.0.0.5', body: PNG },
    })

    await expect(fetchPublicFile('https://img.example.org/a.png', 1000, net)).rejects.toThrow(/non-public/)
    expect(net.connected).toEqual(['https://img.example.org/a.png'])
  })

  it('stops after 3 redirects', async () => {
    const net = fakeNet({
      'loop.example.org': { address: '93.184.216.34', status: 301, headers: { location: '/again' } },
    })

    await expect(fetchPublicFile('https://loop.example.org/', 1000, net)).rejects.toThrow(/too many redirects/)
  })

  it('refuses files over the limit, declared or not', async () => {
    const declared = fakeNet({
      'big.example.org': { address: '93.184.216.34', headers: { 'content-length': '5000' }, body: PNG },
    })
    const undeclared = fakeNet({ 'big.example.org': { address: '93.184.216.34', body: new Uint8Array(5000) } })

    await expect(fetchPublicFile('https://big.example.org/a', 1000, declared)).rejects.toThrow(/larger than/)
    await expect(fetchPublicFile('https://big.example.org/a', 1000, undeclared)).rejects.toThrow(/larger than/)
  })

  it('reports a non-200 answer', async () => {
    const net = fakeNet({ 'gone.example.org': { address: '93.184.216.34', status: 404 } })

    await expect(fetchPublicFile('https://gone.example.org/a', 1000, net)).rejects.toThrow(/answered 404/)
  })
})
