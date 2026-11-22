import config from '@payload-config'
import { getPayload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { datenschutzPage } from './datenschutz'
import { haftungPage } from './haftung'
import { impressumPage } from './impressum'

// Seeds bypass the editorial publish gate so `_status: 'published'` sticks.
const SKIP = { context: { [EDITORIAL_SKIP]: true } } as const

/** All legal pages, in footer order. Folded into the main seed (index.ts) and
 *  upserted idempotently by run-legal.ts. */
export const legalPages = [impressumPage, datenschutzPage, haftungPage]

/** Create each legal page if its slug is missing, otherwise update it. Safe to
 *  re-run against an existing DB without duplicating other seed content. */
export async function upsertLegalPages() {
  const payload = await getPayload({ config })
  for (const page of legalPages) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
    })
    const data = { ...page, reviewStatus: 'approved' }
    if (existing.totalDocs > 0) {
      await payload.update({ collection: 'pages', id: existing.docs[0].id, data: data as never, ...SKIP })
      payload.logger.info(`✓ ${page.title} page updated.`)
    } else {
      await payload.create({ collection: 'pages', data: data as never, ...SKIP })
      payload.logger.info(`✓ ${page.title} page created.`)
    }
  }
}
