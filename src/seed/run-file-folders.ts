import config from '@payload-config'
import { getPayload } from 'payload'
import { ensureFolder, FILED, type FiledCollection, folderOf, type Id, soleMediaOwners } from '../plugins/autofile/file'
import { AUTOFILE_SKIP } from '../plugins/autofile/plugin'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { folderPath } from './folderPlan'

/* Files every event under Events / <year> / <month> (by event date) and every
   blog post under Blog / <year> / <month> (by publish date), Berlin time.
   Images used by exactly one of those posts or events (cover or in the text)
   move into the same folder; images shared with other content stay put.
   Posts or events with an unpublished newer draft are skipped (and listed),
   so filing never touches an editor's pending work.

   New and edited posts/events are filed on save by the autofile plugin
   (src/plugins/autofile); this runner catches up on existing content.
   Dry run by default; safe to run again (only what is in the wrong place moves).
   Stop the dev server first (SQLite lock).

     pnpm payload run src/seed/run-file-folders.ts                       # plan only
     FILE_FOLDERS_APPLY=1 pnpm payload run src/seed/run-file-folders.ts  # apply
*/
const apply = process.env.FILE_FOLDERS_APPLY === '1'
const payload = await getPayload({ config })
type Doc = { id: Id; folder?: unknown; date?: string | null; publishedAt?: string | null; createdAt?: string }
// Our own saves shouldn't re-run the filing hooks (each would rescan all content).
const context = { [EDITORIAL_SKIP]: true, [AUTOFILE_SKIP]: true }
const cache = new Map<string, Id | null>()
const folderFor = (path: string[]) => ensureFolder(payload, path, { create: apply, cache })

const sole = await soleMediaOwners(payload)
const skipped: string[] = []
const ownerPath = new Map<string, string[]>()
let movedDocs = 0
let movedMedia = 0
let alreadyFiled = 0

for (const collection of Object.keys(FILED) as FiledCollection[]) {
  const { docs } = await payload.find({ collection, limit: 0, pagination: false, depth: 0 })
  for (const d of docs as Doc[]) {
    const when = collection === 'events' ? d.date : (d.publishedAt ?? d.createdAt)
    if (!when) {
      skipped.push(`${collection}:${d.id} (no date)`)
      continue
    }
    const latest = await payload.findVersions({
      collection,
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
      await payload.update({ collection, id: d.id, data: { folder: target } as never, context })
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
    await payload.update({ collection: 'media', id: media.id, data: { folder: target } as never, context })
  }
}

payload.logger.info(
  `file-folders ${apply ? 'APPLIED' : 'dry run'}: ${movedDocs} posts/events ${apply ? 'moved' : 'to move'}, ` +
    `${movedMedia} images ${apply ? 'moved' : 'to move'}, ${alreadyFiled} already in place, ${skipped.length} skipped`,
)
for (const s of skipped) payload.logger.warn(`  skipped ${s}`)
if (!apply) payload.logger.info('  nothing changed; run with FILE_FOLDERS_APPLY=1 to apply')
process.exit(0)
