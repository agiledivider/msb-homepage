import config from '@payload-config'
import { type Field, getPayload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { folderPath, mediaFieldNames, mediaRefs, soleOwners } from './folderPlan'

/* Files every event under Events / <year> / <month> (by event date) and every
   blog post under Blog / <year> / <month> (by publish date), Berlin time.
   Images used by exactly one of those posts or events (cover or in the text)
   move into the same folder; images shared with other content stay put.
   Posts or events with an unpublished newer draft are skipped (and listed),
   so filing never touches an editor's pending work.

   Dry run by default; safe to run again (only what is in the wrong place moves).
   Stop the dev server first (SQLite lock).

     pnpm payload run src/seed/run-file-folders.ts                       # plan only
     FILE_FOLDERS_APPLY=1 pnpm payload run src/seed/run-file-folders.ts  # apply
*/
const apply = process.env.FILE_FOLDERS_APPLY === '1'
const payload = await getPayload({ config })
type Id = number | string
type Doc = { id: Id; folder?: unknown; date?: string | null; publishedAt?: string | null; createdAt?: string }
const FILED = { events: 'Events', blog: 'Blog' } as const
type Filed = keyof typeof FILED

// 1 · which fields hold media, anywhere in the schema
const names = new Set<string>()
for (const c of payload.config.collections) mediaFieldNames(c.fields as Field[], names)
for (const g of payload.config.globals) mediaFieldNames(g.fields as Field[], names)
names.add('image') // rich-text Polaroid blocks (BlocksFeature) aren't in the collection schema

// 2 · who uses which media: every collection doc and every global
const usage = new Map<string, Set<Id>>()
const docs: Record<Filed, Doc[]> = { events: [], blog: [] }
for (const c of payload.config.collections) {
  if (c.slug === 'media' || c.slug.startsWith('payload-')) continue
  const { docs: all } = await payload.find({ collection: c.slug as never, limit: 0, pagination: false, depth: 0 })
  for (const d of all as Doc[]) usage.set(`${c.slug}:${d.id}`, mediaRefs(d, names))
  if (c.slug in FILED) docs[c.slug as Filed] = all as Doc[]
}
for (const g of payload.config.globals) {
  usage.set(`global:${g.slug}`, mediaRefs(await payload.findGlobal({ slug: g.slug as never, depth: 0 }), names))
}
const sole = soleOwners(usage)

// 3 · folders: find or (when applying) create Root / year / month
const folderIds = new Map<string, Id | null>()
async function folderFor(path: string[]): Promise<Id | null> {
  let parent: Id | null = null
  for (let i = 0; i < path.length; i++) {
    const key = path.slice(0, i + 1).join('/')
    if (folderIds.has(key)) {
      parent = folderIds.get(key) ?? null
      if (parent === null) return null
      continue
    }
    const where: Record<string, unknown> = {
      and: [
        { name: { equals: path[i] } },
        parent === null ? { folder: { exists: false } } : { folder: { equals: parent } },
      ],
    }
    const found: { docs: unknown[] } = await payload.find({
      collection: 'payload-folders' as never,
      where: where as never,
      limit: 1,
      depth: 0,
    })
    let id: Id | null = (found.docs[0] as Doc | undefined)?.id ?? null
    if (id === null && apply) {
      const created = (await payload.create({
        collection: 'payload-folders' as never,
        data: { name: path[i], ...(parent === null ? {} : { folder: parent }) } as never,
      })) as unknown as Doc
      id = created.id
    }
    folderIds.set(key, id)
    if (id === null) return null // dry run: folder doesn't exist yet
    parent = id
  }
  return parent
}
const folderOf = (d: { folder?: unknown }) =>
  d.folder && typeof d.folder === 'object' ? (d.folder as Doc).id : ((d.folder as Id | null | undefined) ?? null)

// 4 · plan and (maybe) apply
const skipped: string[] = []
let movedDocs = 0
let movedMedia = 0
let alreadyFiled = 0
const ownerPath = new Map<string, string[]>()
for (const collection of Object.keys(FILED) as Filed[]) {
  for (const d of docs[collection]) {
    const when = collection === 'events' ? d.date : (d.publishedAt ?? d.createdAt)
    if (!when) {
      skipped.push(`${collection}:${d.id} (no date)`)
      continue
    }
    const latest = await payload.findVersions({
      collection: collection as never,
      where: { and: [{ parent: { equals: d.id } }, { latest: { equals: true } }] } as never,
      limit: 1,
      depth: 0,
    })
    const v = latest.docs[0] as { version?: { _status?: string } } | undefined
    if (v?.version?._status === 'draft') {
      skipped.push(`${collection}:${d.id} (unpublished draft pending)`)
      continue
    }
    const path = folderPath(FILED[collection], when)
    ownerPath.set(`${collection}:${d.id}`, path)
    const target = await folderFor(path)
    if (target !== null && String(folderOf(d)) === String(target)) {
      alreadyFiled++
      continue
    }
    movedDocs++
    if (apply && target !== null) {
      await payload.update({
        collection: collection as never,
        id: d.id,
        data: { folder: target } as never,
        context: { [EDITORIAL_SKIP]: true },
      })
    }
  }
}
for (const [mediaId, owner] of sole) {
  const path = ownerPath.get(owner)
  if (!path) continue // owned by a page, a global, or a skipped doc
  const media = (await payload.findByID({ collection: 'media', id: mediaId, depth: 0 }).catch(() => null)) as Doc | null
  if (!media) continue
  const target = await folderFor(path)
  if (target !== null && String(folderOf(media)) === String(target)) continue
  movedMedia++
  if (apply && target !== null) {
    await payload.update({ collection: 'media', id: media.id, data: { folder: target } as never })
  }
}

payload.logger.info(
  `file-folders ${apply ? 'APPLIED' : 'dry run'}: ${movedDocs} posts/events ${apply ? 'moved' : 'to move'}, ` +
    `${movedMedia} images ${apply ? 'moved' : 'to move'}, ${alreadyFiled} already in place, ${skipped.length} skipped`,
)
for (const s of skipped) payload.logger.warn(`  skipped ${s}`)
if (!apply) payload.logger.info('  nothing changed; run with FILE_FOLDERS_APPLY=1 to apply')
process.exit(0)
