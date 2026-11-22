import path from 'node:path'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { legacyArchive } from './legacy-archive'
import { legacyArticles } from './legacy-articles'
import { firstParagraphText, legacyBodyToLexical } from './lexical'

// Seeds are a system action, not an editor draft — bypass the editorial publish
// gate so `_status: 'published'` sticks instead of being routed into review.
const SKIP = { context: { [EDITORIAL_SKIP]: true } } as const

/* -------------------------------------------------------------------------
   Seed the migrated "Aktuelles" articles (legacy-articles.ts, hand-migrated,
   plus the generated archive in legacy-archive.ts) into the blog
   and events collections, carrying the legacyId for 301-redirects. Idempotent:
   matches on slug → updates, else creates. Images come from uploads/legacy/.

     pnpm payload run src/seed/run-legacy.ts     # stop the dev server first (DB lock)
   ------------------------------------------------------------------------- */

const LEGACY_DIR = path.resolve(process.cwd(), 'uploads', 'legacy')

/** Ensure a legacy image exists in the media library (create from uploads/legacy). */
async function mediaId(payload: Payload, filename: string, alt: string) {
  const ex = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1 })
  if (ex.totalDocs) return ex.docs[0].id
  const doc = await payload.create({
    collection: 'media',
    data: { alt },
    filePath: path.resolve(LEGACY_DIR, filename),
    // A leftover file of the same name (e.g. after recreating the DB) would make
    // Payload rename the upload, so the filename lookup above never matches and
    // every run adds a copy. The file is our own seed image: overwrite it.
    overwriteExistingFiles: true,
  })
  return doc.id
}

async function upsert(payload: Payload, collection: 'blog' | 'events', slug: string, data: object) {
  const ex = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1 })
  if (ex.totalDocs) {
    await payload.update({ collection, id: ex.docs[0].id, data: data as never, ...SKIP })
  } else {
    await payload.create({ collection, data: data as never, ...SKIP })
  }
}

export async function upsertLegacyArticles() {
  const payload = await getPayload({ config })
  let events = 0
  let posts = 0
  for (const art of [...legacyArticles, ...legacyArchive]) {
    const image = art.image ? await mediaId(payload, art.image, art.title) : undefined
    const inline: Record<string, number | string> = {}
    for (const b of art.body) {
      if ('img' in b) inline[b.img] = await mediaId(payload, b.img, b.alt || art.title)
    }
    const body = legacyBodyToLexical(art.body, inline) as never
    const lead = firstParagraphText(art.body)

    if (art.kind === 'blog') {
      await upsert(payload, 'blog', art.slug, {
        title: art.title,
        slug: art.slug,
        legacyId: art.legacyId,
        _status: 'published',
        reviewStatus: 'approved',
        publishedAt: art.publishedAt,
        excerpt: lead,
        cover: image,
        body,
      })
      posts++
    } else {
      await upsert(payload, 'events', art.slug, {
        title: art.title,
        slug: art.slug,
        legacyId: art.legacyId,
        _status: 'published',
        reviewStatus: 'approved',
        date: art.date,
        endDate: art.endDate,
        timeLabel: art.timeLabel,
        location: art.location ?? 'Kennedyallee 18',
        category: art.category,
        tagColor: art.tagColor ?? 'neutral',
        image,
        description: lead,
        body,
      })
      events++
    }
  }
  payload.logger.info(`✓ Legacy articles seeded: ${events} events, ${posts} blog posts.`)
}
