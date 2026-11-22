import config from '@payload-config'
import { getPayload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { VEREIN_PEOPLE_BLOCK } from './content'

/* Standalone runner: adds the "Menschen & Ansprechpartner" block (S3.1) to the
   published /verein page of an existing DB, if it isn't there yet. Leaves every
   other block and page alone. Stop the dev server first (SQLite lock).

     pnpm payload run src/seed/run-verein-people.ts
*/
const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: 'verein' } }, limit: 1 })
const page = docs[0]
if (!page) {
  payload.logger.error('run-verein-people: no /verein page, nothing changed')
} else if (page.layout?.some((b) => b.blockType === 'people')) {
  payload.logger.info('run-verein-people: /verein already has the block, nothing changed')
} else {
  await payload.update({
    collection: 'pages',
    id: page.id,
    context: { [EDITORIAL_SKIP]: true },
    data: { layout: [...(page.layout ?? []), VEREIN_PEOPLE_BLOCK], _status: 'published', reviewStatus: 'approved' },
  })
  payload.logger.info('run-verein-people: block added to /verein')
}
process.exit(0)
