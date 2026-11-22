/**
 * Claude via MCP (Tier B, Payload on a throwaway SQLite DB).
 *
 * Drives the real `/api/mcp` endpoint handler with real API keys. Claude acts
 * with the key owner's own rights, only ever writes drafts, can't publish,
 * approve or delete, and does nothing without a valid key. A key used directly
 * against REST (as its own principal) counts as nobody.
 */
import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { createLocalReq } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload

type Doc = Record<string, unknown> & { id: number | string }
type ToolResult = { isError?: boolean; content?: { text: string }[] }

/** A user with exactly these RBAC permissions, plus an MCP key bound to them. */
const aUserWithKey = async (label: string, permissionNames: string[]) => {
  const permissions: Array<number | string> = []
  for (const name of permissionNames) {
    const found = await payload.find({ collection: 'permissions' as never, where: { name: { equals: name } } })
    const perm = (found.docs[0] ??
      (await payload.create({ collection: 'permissions' as never, data: { type: 'single', name } as never }))) as Doc
    permissions.push(perm.id)
  }
  const role = (await payload.create({
    collection: 'roles' as never,
    data: { name: `mcp-${label}-${randomUUID()}`, permissions } as never,
  })) as unknown as Doc
  const user = (await payload.create({
    collection: 'users',
    data: { email: `mcp-${label}-${randomUUID()}@test.de`, password: 'local-password', roles: [role.id] } as never,
  })) as unknown as Doc
  const key = randomUUID()
  const sessionUser = {
    ...(await payload.findByID({ collection: 'users', id: user.id, depth: 2 })),
    collection: 'users',
  }
  // Created the way the admin does it: by the user themselves, defaults applied.
  await payload.create({
    collection: 'payload-mcp-api-keys' as never,
    data: { label: `Claude ${label}`, enableAPIKey: true, apiKey: key } as never,
    user: sessionUser,
    overrideAccess: false,
  })
  return { user, key }
}

const EDITOR_PERMS = ['blog:create', 'blog:read', 'blog:update', 'events:create', 'events:read', 'events:update']
const REVIEWER_PERMS = [...EDITOR_PERMS, 'pages:create', 'pages:read', 'pages:update', 'editorial:review']

/** One JSON-RPC call to the MCP endpoint, as an MCP client sends it. */
const mcp = async (key: string | null, method: string, params: Record<string, unknown> = {}) => {
  const endpoint = payload.config.endpoints.find((e) => e.path === '/mcp' && e.method === 'post')
  if (!endpoint) throw new Error('no /mcp endpoint')
  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' })
  if (key) headers.set('Authorization', `Bearer ${key}`)
  const req = (await createLocalReq({}, payload)) as PayloadRequest
  Object.assign(req, {
    url: 'http://localhost:3000/api/mcp',
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  try {
    const res = await endpoint.handler(req)
    const text = await res.text()
    const json = text.startsWith('{') ? text : (text.match(/^data: (.*)$/m)?.[1] ?? '{}')
    return { status: res.status, body: JSON.parse(json) as { result?: Record<string, unknown>; error?: unknown } }
  } catch (err) {
    return { status: (err as { status?: number }).status ?? 500, body: {} }
  }
}

const callTool = async (key: string, name: string, args: Record<string, unknown>) => {
  const res = await mcp(key, 'tools/call', { name, arguments: args })
  return res.body.result as ToolResult
}

const findBySlug = async (collection: 'blog' | 'events' | 'pages', slug: string, draft = false) =>
  (await payload.find({ collection, where: { slug: { equals: slug } }, draft, depth: 0, limit: 1 }))
    .docs[0] as unknown as Doc | undefined

let editor: Awaited<ReturnType<typeof aUserWithKey>>
let reviewer: Awaited<ReturnType<typeof aUserWithKey>>

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
  editor = await aUserWithKey('editor', EDITOR_PERMS)
  reviewer = await aUserWithKey('reviewer', REVIEWER_PERMS)
})

describe('Claude via MCP', () => {
  it('does nothing without a valid key', async () => {
    expect((await mcp(null, 'tools/list')).status).toBe(401)
    expect((await mcp('not-a-key', 'tools/list')).status).toBe(401)
  })

  it('offers create, update and find for content, find for media, and no delete', async () => {
    const res = await mcp(editor.key, 'tools/list')
    const names = ((res.body.result?.tools ?? []) as { name: string }[]).map((t) => t.name)

    expect(names).toEqual(expect.arrayContaining(['createBlog', 'updateBlog', 'findBlog', 'createEvents', 'findMedia']))
    expect(names.filter((n) => n.startsWith('delete') || n === 'createMedia')).toEqual([])
  })

  it("creates an event from a flyer as a draft under the editor's name, even when asked to publish", async () => {
    const slug = `flyer-${randomUUID()}`
    const result = await callTool(editor.key, 'createEvents', {
      title: 'Löten für Einsteiger',
      slug,
      date: '2026-12-12T17:00:00.000Z',
      _status: 'published',
      reviewStatus: 'approved',
    })

    expect(result.isError).toBeFalsy()
    const draft = await findBySlug('events', slug, true)
    expect(draft?._status).toBe('draft')
    expect(draft?.reviewStatus).toBe('draft')
    expect(draft?.createdBy).toBe(editor.user.id)
    const publicRead = await payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
      overrideAccess: false,
    })
    expect(publicRead.docs).toEqual([])
  })

  it('keeps a live page live when a reviewer edits it through Claude, and stores the edit as a draft', async () => {
    const slug = `live-${randomUUID()}`
    await payload.create({
      collection: 'pages',
      data: { title: 'Live-Titel', slug, _status: 'published', reviewStatus: 'approved' } as never,
      context: { [EDITORIAL_SKIP]: true },
    })
    const live = (await findBySlug('pages', slug)) as Doc

    const result = await callTool(reviewer.key, 'updatePages', { id: live.id, title: 'Von Claude', draft: false })

    expect(result.isError).toBeFalsy()
    const published = (await findBySlug('pages', slug)) as Doc
    expect(published._status).toBe('published')
    expect(published.title).toBe('Live-Titel')
    expect((await findBySlug('pages', slug, true))?.title).toBe('Von Claude')
  })

  it("can't do what the key owner's account can't", async () => {
    const slug = `no-rights-${randomUUID()}`
    const result = await callTool(editor.key, 'createPages', { title: 'Nicht erlaubt', slug })

    expect(result?.isError ?? true).toBe(true)
    expect(await findBySlug('pages', slug, true)).toBeUndefined()
  })
})

describe('uploading media through Claude', () => {
  // 1x1 transparent PNG
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  it('offers uploadMedia', async () => {
    const res = await mcp(editor.key, 'tools/list')
    const names = ((res.body.result?.tools ?? []) as { name: string }[]).map((t) => t.name)

    expect(names).toContain('uploadMedia')
  })

  it('uploads a base64 image with a safe name and the Claude marker', async () => {
    const result = await callTool(editor.key, 'uploadMedia', {
      alt: 'Ein Pixel',
      data: PNG,
      filename: '../Werkstatt Foto.jpeg',
    })

    expect(result.isError).toBeFalsy()
    const id = Number(result.content?.[0]?.text.match(/media (\d+)/)?.[1])
    const media = (await payload.findByID({ collection: 'media', id })) as unknown as Doc
    expect(media.filename).toMatch(/^werkstatt-foto(-\d+)?\.png$/)
    expect(media.mimeType).toBe('image/png')
    expect(media.uploadedByClaude).toBe(true)
  })

  it('refuses SVG and other files that are not an image or PDF', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString(
      'base64',
    )
    const before = (await payload.find({ collection: 'media', limit: 0 })).totalDocs

    const result = await callTool(editor.key, 'uploadMedia', { alt: 'x', data: svg, filename: 'logo.svg' })

    expect(result.isError).toBe(true)
    expect((await payload.find({ collection: 'media', limit: 0 })).totalDocs).toBe(before)
  })

  it('refuses a URL into the internal network', async () => {
    const result = await callTool(editor.key, 'uploadMedia', { alt: 'x', url: 'https://169.254.169.254/latest' })

    expect(result.isError).toBe(true)
    expect(result.content?.[0]?.text).toMatch(/non-public/)
  })

  it('leaves uploads made in the admin unmarked', async () => {
    const media = (await payload.create({
      collection: 'media',
      data: { alt: 'Admin-Upload' } as never,
      file: { data: Buffer.from(PNG, 'base64'), mimetype: 'image/png', name: 'admin.png', size: 70 },
    })) as unknown as Doc

    expect(media.uploadedByClaude).toBe(false)
  })
})

describe('when someone leaves', () => {
  it('deleting their CMS account also removes their keys, and the key stops working', async () => {
    const leaver = await aUserWithKey('leaver', EDITOR_PERMS)

    await payload.delete({ collection: 'users', id: leaver.user.id })

    const keys = await payload.find({
      collection: 'payload-mcp-api-keys' as never,
      where: { user: { equals: leaver.user.id } },
    })
    expect(keys.totalDocs).toBe(0)
    expect((await mcp(leaver.key, 'tools/list')).status).toBe(401)
  })
})

describe('an MCP key used directly against REST', () => {
  it('logs nobody in', async () => {
    const { user } = await payload.auth({
      headers: new Headers({ Authorization: `payload-mcp-api-keys API-Key ${editor.key}` }),
    })

    expect(user).toBeNull()
  })

  // Second layer, should a Payload update ever let the key log in as itself:
  // a principal from another auth collection counts as nobody for writes.
  it('would count as nobody for settings, media and folders', async () => {
    const asKey = { user: { id: 1, collection: 'payload-mcp-api-keys' } as never, overrideAccess: false } as const

    await expect(payload.updateGlobal({ slug: 'siteSettings', data: {} as never, ...asKey })).rejects.toThrow(
      /not allowed/i,
    )
    await expect(
      payload.create({ collection: 'payload-folders' as never, data: { name: 'Key-Ordner' } as never, ...asKey }),
    ).rejects.toThrow(/not allowed/i)
    await expect(
      payload.create({ collection: 'media', data: { alt: 'x' } as never, filePath: undefined, ...asKey }),
    ).rejects.toThrow(/not allowed/i)
  })
})
