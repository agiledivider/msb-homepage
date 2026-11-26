import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { type Env, parseCli, parseEnv, prepareFile, uploadViaMcp } from '../../scripts/media-upload'

const ENV: Env = { MSB_MCP_URL: 'https://cms.example.test/api/mcp', MSB_MCP_KEY: 'test-key' }

const anImage = (width: number, height: number, alpha = false) =>
  sharp({
    create: { width, height, channels: alpha ? 4 : 3, background: { r: 200, g: 220, b: 40, alpha: alpha ? 0.5 : 1 } },
  })
    .png()
    .toBuffer()

/** A fake CMS: answers initialize, then the tool call with `toolText`. Records every request. */
const aFakeCms = (toolText: string, opts: { isError?: boolean; sse?: boolean } = {}) => {
  const calls: {
    headers: Record<string, string>
    body: { method: string; params: { arguments?: Record<string, string> } }
  }[] = []
  const fetchFn = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body))
    calls.push({ headers: init.headers as Record<string, string>, body })
    const result =
      body.method === 'initialize'
        ? { protocolVersion: '2025-03-26', capabilities: {} }
        : { content: [{ type: 'text', text: toolText }], isError: opts.isError }
    const json = JSON.stringify({ jsonrpc: '2.0', id: body.id, result })
    return new Response(opts.sse ? `event: message\ndata: ${json}\n\n` : json, {
      headers: { 'mcp-session-id': 'session-1' },
    })
  }) as typeof fetch
  return { fetchFn, calls }
}

describe('media:upload command line', () => {
  it('reads file, alt text, AI label and size', () => {
    expect(parseCli(['photo.jpg', '--alt', ' Ein Drucker ', '--ai', 'edited', '--max', '1200'])).toEqual({
      file: 'photo.jpg',
      alt: 'Ein Drucker',
      ai: 'edited',
      max: 1200,
    })
  })

  it('names every problem at once', () => {
    expect(() => parseCli(['--ai', 'maybe', '--max', 'big'])).toThrow(
      /one file[\s\S]*--alt is required[\s\S]*--ai must be[\s\S]*--max must be/,
    )
  })

  it('lists every missing env value without printing any', () => {
    expect(() => parseEnv({})).toThrow(/MSB_MCP_URL[\s\S]*MSB_MCP_KEY/)
    expect(parseEnv({ ...ENV, OTHER: 'x' })).toEqual(ENV)
  })
})

describe('media:upload file preparation', () => {
  it('shrinks a large photo to the long-side limit as JPEG', async () => {
    const out = await prepareFile(await anImage(4000, 3000), 'IMG_1234.png', 1600)
    const meta = await sharp(out.data).metadata()
    expect([meta.format, meta.width, meta.height, out.filename]).toEqual(['jpeg', 1600, 1200, 'IMG_1234.jpg'])
  })

  it('never enlarges a small image', async () => {
    const out = await prepareFile(await anImage(300, 200), 'small.png', 1600)
    expect((await sharp(out.data).metadata()).width).toBe(300)
  })

  it('keeps transparency as WebP', async () => {
    const out = await prepareFile(await anImage(800, 800, true), 'sketch.png', 1600)
    expect([(await sharp(out.data).metadata()).format, out.filename]).toEqual(['webp', 'sketch.webp'])
  })

  it('uploads PDFs unchanged', async () => {
    const pdf = Buffer.from('%PDF-1.7\n%fake\n')
    const out = await prepareFile(pdf, 'satzung.pdf', 1600)
    expect(out).toEqual({ data: pdf, filename: 'satzung.pdf' })
  })
})

describe('media:upload talks to the CMS like Claude does', () => {
  const file = { data: Buffer.from('jpeg-bytes'), filename: 'drucker.jpg' }

  it('calls uploadMedia with the key, session and metadata, and returns the media ID', async () => {
    const cms = aFakeCms('Uploaded media 42 (drucker.jpg, image/jpeg). Use this ID in a post or event.', { sse: true })
    const res = await uploadViaMcp(ENV, file, { alt: 'Ein Drucker', ai: 'none' }, cms.fetchFn)

    expect(res.mediaId).toBe(42)
    expect(cms.calls.map((c) => c.body.method)).toEqual(['initialize', 'tools/call'])
    expect(cms.calls.every((c) => c.headers.authorization === 'Bearer test-key')).toBe(true)
    expect(cms.calls[1].headers['mcp-session-id']).toBe('session-1')
    expect(cms.calls[1].body.params).toMatchObject({
      name: 'uploadMedia',
      arguments: { data: file.data.toString('base64'), filename: 'drucker.jpg', alt: 'Ein Drucker', aiLabel: 'none' },
    })
  })

  it('passes the CMS refusal on', async () => {
    const cms = aFakeCms('This file type is not allowed.', { isError: true })
    await expect(uploadViaMcp(ENV, file, { alt: 'x', ai: 'none' }, cms.fetchFn)).rejects.toThrow(
      'CMS refused the upload: This file type is not allowed.',
    )
  })

  it('stops on an HTTP error, e.g. a wrong key', async () => {
    const fetchFn = (async () => new Response('Unauthorized', { status: 401 })) as unknown as typeof fetch
    await expect(uploadViaMcp(ENV, file, { alt: 'x', ai: 'none' }, fetchFn)).rejects.toThrow(
      'CMS answered 401 to initialize',
    )
  })
})
