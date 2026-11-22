import type { Field, Payload, PayloadRequest } from 'payload'
import { mediaFieldNames, mediaRefs, soleOwners } from '../../seed/folderPlan'

/* Payload-side helpers for filing into Blog|Events / year / month, shared by
   the save hooks (plugin.ts) and the one-off runner (src/seed/run-file-folders.ts). */

export type Id = number | string
type Doc = { id: Id; folder?: unknown }

export const FILED = { events: 'Events', blog: 'Blog' } as const
export type FiledCollection = keyof typeof FILED

/** The folder a doc sits in, as an id (populated or not). */
export const folderOf = (d: { folder?: unknown } | null | undefined): Id | null =>
  d?.folder && typeof d.folder === 'object' ? (d.folder as Doc).id : ((d?.folder as Id | null | undefined) ?? null)

/** Every field name that holds media, anywhere in the schema (memoised per config). */
const namesCache = new WeakMap<object, Set<string>>()
export function mediaNames(payload: Payload): Set<string> {
  const cached = namesCache.get(payload.config)
  if (cached) return cached
  const names = new Set<string>()
  for (const c of payload.config.collections) mediaFieldNames(c.fields as Field[], names)
  for (const g of payload.config.globals) mediaFieldNames(g.fields as Field[], names)
  names.add('image') // rich-text Polaroid blocks (BlocksFeature) aren't in the collection schema
  namesCache.set(payload.config, names)
  return names
}

/** owner (`collection:id` or `global:slug`) → media ids it uses, across all content. */
export async function mediaUsage(payload: Payload, req?: PayloadRequest): Promise<Map<string, Set<Id>>> {
  const names = mediaNames(payload)
  const usage = new Map<string, Set<Id>>()
  for (const c of payload.config.collections) {
    if (c.slug === 'media' || c.slug.startsWith('payload-')) continue
    const { docs } = await payload.find({
      collection: c.slug as never,
      limit: 0,
      pagination: false,
      depth: 0,
      req,
      overrideAccess: true,
    })
    for (const d of docs as Doc[]) usage.set(`${c.slug}:${d.id}`, mediaRefs(d, names))
  }
  for (const g of payload.config.globals) {
    const doc = await payload.findGlobal({ slug: g.slug as never, depth: 0, req, overrideAccess: true })
    usage.set(`global:${g.slug}`, mediaRefs(doc, names))
  }
  return usage
}

/** media id → its single owner, for media used by exactly one doc or global. */
export const soleMediaOwners = async (payload: Payload, req?: PayloadRequest) =>
  soleOwners(await mediaUsage(payload, req))

/**
 * Id of the folder at `path` (e.g. ['Events', '2024', '05 Mai']), creating
 * missing levels unless `create` is false (then null if any level is missing).
 */
export async function ensureFolder(
  payload: Payload,
  path: string[],
  { req, create = true, cache }: { req?: PayloadRequest; create?: boolean; cache?: Map<string, Id | null> } = {},
): Promise<Id | null> {
  let parent: Id | null = null
  for (let i = 0; i < path.length; i++) {
    const key = path.slice(0, i + 1).join('/')
    let id: Id | null | undefined = cache?.get(key)
    if (id === undefined) {
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
        req,
        overrideAccess: true,
      })
      id = (found.docs[0] as Doc | undefined)?.id ?? null
      if (id === null && create) {
        const created = (await payload.create({
          collection: 'payload-folders' as never,
          data: { name: path[i], ...(parent === null ? {} : { folder: parent }) } as never,
          req,
          overrideAccess: true,
        })) as unknown as Doc
        id = created.id
      }
      cache?.set(key, id)
    }
    if (id === null) return null
    parent = id
  }
  return parent
}
