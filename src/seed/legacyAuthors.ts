import type { Payload } from 'payload'
import { z } from 'zod'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import raw from './legacy-authors.json'

/**
 * Authors of the posts imported from the old Joomla site (S5.13). The archive
 * import kept the dates but dropped the "Geschrieben von" line; this puts it back.
 *
 * Runs on every start (prod seed) and in `pnpm seed`. Only fills an empty
 * author, and skips a post whose latest version is an unpublished draft, so an
 * editor's work is never touched. Idempotent: a second run changes nothing.
 */
const LegacyAuthorsSchema = z.object({
  source: z.string(),
  authors: z.record(z.string().regex(/^\d+$/), z.string().min(1)),
})
export const LEGACY_AUTHORS: Record<number, string> = Object.fromEntries(
  Object.entries(LegacyAuthorsSchema.parse(raw).authors).map(([id, name]) => [Number(id), name]),
)

const SKIP = { context: { [EDITORIAL_SKIP]: true } } as const

/** Returns how many posts got an author. */
export async function fillLegacyAuthors(payload: Payload): Promise<number> {
  const { docs } = await payload.find({
    collection: 'blog',
    where: { legacyId: { in: Object.keys(LEGACY_AUTHORS).map(Number) } },
    limit: 0,
    pagination: false,
    depth: 0,
  })
  let filled = 0
  for (const post of docs) {
    const author = post.legacyId ? LEGACY_AUTHORS[post.legacyId] : undefined
    if (!author || post.author?.trim()) continue
    const latest = await payload.findVersions({
      collection: 'blog',
      where: { parent: { equals: post.id } },
      sort: '-updatedAt',
      limit: 1,
      depth: 0,
    })
    if (latest.docs[0] && latest.docs[0].version._status !== 'published') continue
    await payload.update({ collection: 'blog', id: post.id, data: { author }, depth: 0, ...SKIP })
    filled++
  }
  if (filled) payload.logger.info(`legacy authors: filled ${filled} blog posts`)
  return filled
}
