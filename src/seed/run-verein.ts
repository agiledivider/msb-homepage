import config from '@payload-config'
import { getPayload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { VEREIN_BLOCKS } from './content'
import { convertVereinPage } from './vereinLayout'

/* Standalone runner for an existing DB: brings the published /verein page up
   to the seeded layout without touching anything an editor wrote.
     - converts an old "Verein Intro" into Zwei Spalten + Werte, with the
       "Was ist ein Makerspace?" text first on the left (servers get this from
       the migration; dev runs on `push`, so it needs this runner);
     - appends the sections in VEREIN_BLOCKS (people S3.1, press S3.4, documents S3.3, …) that
       the page has no block of yet.
   Leaves every other block, and every page, alone; safe to run again.
   Stop the dev server first (SQLite lock).

     pnpm payload run src/seed/run-verein.ts
*/
const payload = await getPayload({ config })
const converted = await convertVereinPage(payload)

const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: 'verein' } }, limit: 1 })
const page = docs[0]
if (!page) {
  payload.logger.error('run-verein: no /verein page, nothing changed')
} else {
  // Sections count wherever they are, also inside Zwei Spalten (Menschen sits in the left column).
  type Node = { blockType: string; left?: Node[] | null; right?: Node[] | null }
  const have = new Set(
    ((page.layout ?? []) as Node[]).flatMap((b) => [b, ...(b.left ?? []), ...(b.right ?? [])].map((x) => x.blockType)),
  )
  const missing = VEREIN_BLOCKS.filter(({ type }) => !have.has(type))
  if (missing.length) {
    const added = await Promise.all(missing.map(({ make }) => make(payload)))
    await payload.update({
      collection: 'pages',
      id: page.id,
      context: { [EDITORIAL_SKIP]: true },
      data: { layout: [...(page.layout ?? []), ...added] as never, _status: 'published', reviewStatus: 'approved' },
    })
  }
  const changes = [...(converted ? ['columns + values'] : []), ...missing.map(({ type }) => type)]
  payload.logger.info(
    changes.length
      ? `run-verein: ${changes.join(', ')} on /verein`
      : 'run-verein: /verein is up to date, nothing changed',
  )
}
process.exit(0)
