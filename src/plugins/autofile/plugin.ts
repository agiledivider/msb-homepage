import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, Config, Plugin } from 'payload'
import { folderPath, mediaRefs } from '../../seed/folderPlan'
import { ensureFolder, FILED, type FiledCollection, folderOf, mediaNames, soleMediaOwners } from './file'

/** Set in `req.context` to save without automatic filing (e.g. the filing runner itself). */
export const AUTOFILE_SKIP = 'autofileSkip'

/**
 * Auto-filing (Falk 2026-11-22): an event or blog post that has no folder yet
 * goes into Events|Blog / year / month on save (event date, or publish date for
 * posts, Berlin time). A folder an editor chose is never overridden. Images the
 * doc uses that are still unfiled and used by nothing else follow it.
 */
export const autofilePlugin =
  (): Plugin =>
  (config: Config): Config => ({
    ...config,
    collections: (config.collections ?? []).map((col) =>
      col.slug in FILED
        ? {
            ...col,
            hooks: {
              ...col.hooks,
              beforeChange: [...(col.hooks?.beforeChange ?? []), fileDoc(col.slug as FiledCollection)],
              afterChange: [...(col.hooks?.afterChange ?? []), fileImages(col.slug as FiledCollection)],
            },
          }
        : col,
    ),
  })

const fileDoc =
  (collection: FiledCollection): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    if (req.context?.[AUTOFILE_SKIP]) return data
    // A folder chosen in this save, or one the doc already has, wins. The admin form
    // sends `folder: null` on every save, so "empty" can't mean "keep at the top":
    // events and posts without a folder always get filed.
    if (folderOf(data) !== null || (data.folder === undefined && folderOf(originalDoc) !== null)) return data
    const when =
      collection === 'events'
        ? (data.date ?? originalDoc?.date)
        : (data.publishedAt ?? originalDoc?.publishedAt ?? originalDoc?.createdAt ?? new Date().toISOString())
    if (!when || Number.isNaN(Date.parse(when))) return data
    data.folder = await ensureFolder(req.payload, folderPath(FILED[collection], when), { req })
    return data
  }

const fileImages =
  (collection: FiledCollection): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if (req.context?.[AUTOFILE_SKIP]) return doc
    const folder = folderOf(doc)
    if (folder === null) return doc
    const refs = [...mediaRefs(doc, mediaNames(req.payload))]
    if (!refs.length) return doc

    // Only unfiled images are candidates; checking who else uses them is the
    // expensive part, so it runs once and only when there is a candidate.
    const unfiled = []
    for (const id of refs) {
      const media = await req.payload
        .findByID({ collection: 'media', id, depth: 0, req, overrideAccess: true })
        .catch(() => null)
      if (media && folderOf(media) === null) unfiled.push(media.id)
    }
    if (!unfiled.length) return doc

    const owners = await soleMediaOwners(req.payload, req)
    for (const id of unfiled) {
      if (owners.get(String(id)) !== `${collection}:${doc.id}`) continue
      await req.payload.update({ collection: 'media', id, data: { folder } as never, req, overrideAccess: true })
    }
    return doc
  }
