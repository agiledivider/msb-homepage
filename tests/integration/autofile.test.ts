/**
 * Auto-filing (Tier B, Payload Local API on a throwaway SQLite DB): an event
 * or post saved without a folder lands in Events|Blog / year / month, and the
 * images only it uses follow; an editor's own folder and shared images stay.
 */
import path from 'node:path'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { AUTOFILE_SKIP } from '@/plugins/autofile/plugin'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

let payload: Payload
type Doc = { id: number | string; folder?: unknown; name?: string }

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
})

const SKIP = { [EDITORIAL_SKIP]: true }
const folderId = (d: Doc): number | string | null =>
  d.folder && typeof d.folder === 'object' ? (d.folder as Doc).id : ((d.folder as number | string | undefined) ?? null)

/** Folder names from the root down to the doc's folder. */
async function pathOf(d: Doc): Promise<string[]> {
  const names: string[] = []
  let id = folderId(d)
  while (id !== null) {
    const f = (await payload.findByID({ collection: 'payload-folders' as never, id, depth: 0 })) as unknown as Doc
    names.unshift(String(f.name))
    id = folderId(f)
  }
  return names
}

let n = 0
const upload = async () =>
  (await payload.create({
    collection: 'media',
    data: { alt: `Testbild ${++n}` },
    filePath: path.resolve(process.cwd(), 'uploads', 'logo-telekom.svg'),
  })) as unknown as Doc

const event = (date: string, extra: Record<string, unknown> = {}, context: Record<string, unknown> = SKIP) =>
  payload.create({
    collection: 'events',
    data: { title: `Autofile ${++n}`, slug: `autofile-${n}`, date, _status: 'published', ...extra } as never,
    context,
  }) as unknown as Promise<Doc>

const reload = async (collection: 'events' | 'media' | 'blog', d: Doc) =>
  (await payload.findByID({ collection, id: d.id, depth: 0 })) as unknown as Doc

describe('auto-filing', () => {
  it('files a new event under Events / year / month, with the image only it uses', async () => {
    const image = await upload()
    const e = await reload('events', await event('2024-05-12T12:00:00.000Z', { image: image.id }))

    expect(await pathOf(e)).toEqual(['Events', '2024', '05 Mai'])
    expect(folderId(await reload('media', image))).toBe(folderId(e))
  })

  it('reuses the month folder instead of creating a second one', async () => {
    const a = await reload('events', await event('2023-02-03T12:00:00.000Z'))
    const b = await reload('events', await event('2023-02-20T12:00:00.000Z'))

    expect(folderId(a)).toBe(folderId(b))
    const months = await payload.find({
      collection: 'payload-folders' as never,
      where: { name: { equals: '02 Februar' } } as never,
      limit: 0,
    })
    expect(months.totalDocs).toBe(1)
  })

  it("keeps a folder the editor chose, and files the event's own image there", async () => {
    const mine = (await payload.create({
      collection: 'payload-folders' as never,
      data: { name: 'Sonderreihe' } as never,
    })) as unknown as Doc
    const image = await upload()
    const e = await reload('events', await event('2024-06-01T12:00:00.000Z', { folder: mine.id, image: image.id }))

    expect(folderId(e)).toBe(mine.id)
    expect(folderId(await reload('media', image))).toBe(mine.id)
  })

  it('leaves an image alone that another event uses too', async () => {
    const shared = await upload()
    // the first event is saved without filing, so the image is still unfiled when the second one arrives
    await event('2024-07-01T12:00:00.000Z', { image: shared.id }, { ...SKIP, [AUTOFILE_SKIP]: true })
    await event('2024-07-02T12:00:00.000Z', { image: shared.id })

    expect(folderId(await reload('media', shared))).toBeNull()
  })

  it('files a blog post by its publish date', async () => {
    const post = (await payload.create({
      collection: 'blog',
      data: {
        title: 'Autofile-Post',
        slug: 'autofile-post',
        publishedAt: '2022-12-24T10:00:00.000Z',
        _status: 'published',
      } as never,
      context: SKIP,
    })) as unknown as Doc

    expect(await pathOf(await reload('blog', post))).toEqual(['Blog', '2022', '12 Dezember'])
  })
})
