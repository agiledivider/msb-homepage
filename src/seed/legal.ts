import path from 'node:path'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { datenschutzPage } from './datenschutz'
import { haftungPage } from './haftung'
import { impressumPage } from './impressum'

/** All legal pages, in footer order. Folded into the main seed (index.ts) and
 *  upserted idempotently by run-legal.ts. */
export const legalPages = [impressumPage, datenschutzPage, haftungPage]

/** Filename the Impressum links to (/api/media/file/satzung.pdf). Keep it stable
 *  when swapping the PDF in the admin so the link keeps working. */
export const SATZUNG_FILENAME = 'satzung.pdf'

/** Ensure the Satzung PDF exists in the media library (create from uploads/ if
 *  missing). Idempotent — matches on filename. */
export async function upsertSatzung(payload: Payload) {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: SATZUNG_FILENAME } },
    limit: 1,
  })
  if (existing.totalDocs > 0) return
  await payload.create({
    collection: 'media',
    data: { alt: 'Satzung des MakerSpace Bonn e. V.' },
    filePath: path.resolve(process.cwd(), 'uploads', SATZUNG_FILENAME),
  })
  payload.logger.info('✓ Satzung PDF added to media.')
}

/** Create each legal page if its slug is missing, otherwise update it. Safe to
 *  re-run against an existing DB without duplicating other seed content. */
export async function upsertLegalPages() {
  const payload = await getPayload({ config })
  await upsertSatzung(payload)
  for (const page of legalPages) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
    })
    if (existing.totalDocs > 0) {
      await payload.update({ collection: 'pages', id: existing.docs[0].id, data: page })
      payload.logger.info(`✓ ${page.title} page updated.`)
    } else {
      await payload.create({ collection: 'pages', data: page })
      payload.logger.info(`✓ ${page.title} page created.`)
    }
  }
}
