import config from '@payload-config'
import { getPayload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { VEREIN_BLOCKS } from './content'

/* Standalone runner: adds the Verein page's sections (VEREIN_BLOCKS: people
   S3.1, press S3.4, …) to the published /verein page of an existing DB,
   each only if the page doesn't have one of that type yet. Leaves every other
   block, and every page, alone; safe to run again after each new section.
   Stop the dev server first (SQLite lock).

     pnpm payload run src/seed/run-verein.ts
*/
const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: 'verein' } }, limit: 1 })
const page = docs[0]
if (!page) {
  payload.logger.error('run-verein: no /verein page, nothing changed')
} else {
  const have = new Set((page.layout ?? []).map((b) => b.blockType))
  const missing = VEREIN_BLOCKS.filter(([type]) => !have.has(type as never))
  if (!missing.length) {
    payload.logger.info('run-verein: /verein has every section, nothing changed')
  } else {
    const added = await Promise.all(missing.map(([, make]) => make(payload)))
    await payload.update({
      collection: 'pages',
      id: page.id,
      context: { [EDITORIAL_SKIP]: true },
      data: { layout: [...(page.layout ?? []), ...added] as never, _status: 'published', reviewStatus: 'approved' },
    })
    payload.logger.info(`run-verein: added ${missing.map(([type]) => type).join(', ')} to /verein`)
  }
}
process.exit(0)
