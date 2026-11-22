import type { Payload, PayloadRequest } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { a, doc, h2, p, t } from './lexical'

/**
 * /verein moves from the one-off "Verein Intro" block to general blocks
 * (2026-11-22): Zwei Spalten (left: Text, Text, Zitat; right: Zeitleiste) and
 * Werte below. Used by the seed, by run-verein.ts (dev, push) and by the
 * migration that ships it (servers), so all three build the page the same way.
 */

/** "Was ist ein Makerspace?" for newcomers (S3.5; text drafted 2026-11-22): first text on the left. */
export const VEREIN_EXPLAINER = doc([
  h2('Was ist ein Makerspace?'),
  p(
    t(
      'Ein Makerspace ist eine offene Werkstatt, die sich viele teilen. Maschinen und Werkzeug, die sich allein kaum jemand anschafft – 3D-Drucker, CNC-Fräse, Schweißgerät, Nähmaschinen, Lötstationen –, stehen allen zur Verfügung, die etwas selbst bauen, reparieren oder ausprobieren wollen.',
    ),
  ),
  p(
    t(
      'Wie man damit umgeht, lernst du hier: bei Einweisungen an den Maschinen, in Workshops zu Löten, CAD oder CNC und von Leuten, die gern zeigen, wie es geht.',
    ),
  ),
  p(
    t('Am einfachsten lernst du uns bei der '),
    a('Offenen Tür', '/events'),
    t(' kennen: vorbeikommen, umschauen, fragen.'),
  ),
])

/** The fields of a "Verein Intro" block that carry content. */
export type VereinIntroData = {
  body?: unknown
  quote?: string | null
  timelineTitle?: string | null
  timeline?: { year?: string | null; text?: string | null }[] | null
  values?: { title: string; text?: string | null }[] | null
}

/**
 * One "Verein Intro" as general blocks: Zwei Spalten (3:2, like before) with the
 * explainer, the body and the quote on the left and the timeline on the right,
 * then Werte. Empty parts are left out; array ids are dropped (new rows).
 */
export function vereinIntroToBlocks(intro: VereinIntroData, explainer: unknown = VEREIN_EXPLAINER): object[] {
  const left: object[] = [{ blockType: 'prose', body: explainer }]
  if (intro.body) left.push({ blockType: 'prose', body: intro.body })
  if (intro.quote) left.push({ blockType: 'quote', text: intro.quote })
  const right: object[] = intro.timeline?.length
    ? [
        {
          blockType: 'timeline',
          title: intro.timelineTitle ?? 'DIE KURZE GESCHICHTE',
          items: intro.timeline.map(({ year, text }) => ({ year, text })),
        },
      ]
    : []
  const blocks: object[] = [{ blockType: 'columns', split: '3-2', left, right }]
  if (intro.values?.length) {
    blocks.push({ blockType: 'values', items: intro.values.map(({ title, text }) => ({ title, text })) })
  }
  return blocks
}

type LayoutBlock = { blockType: string; left?: { blockType: string }[] | null }

/**
 * The /verein layout brought to the current shape; `changed` says whether
 * anything moved. Idempotent.
 *  1. every "Verein Intro" becomes Zwei Spalten + Werte;
 *  2. "Menschen & Ansprechpartner" moves to the end of the left column (Falk,
 *     2026-11-22), unless that column already has one.
 */
export function convertLayout(layout: readonly object[]): { layout: object[]; changed: boolean } {
  let changed = false
  let out = (layout as LayoutBlock[]).flatMap((block) => {
    if (block.blockType !== 'vereinIntro') return [block]
    changed = true
    return vereinIntroToBlocks(block as VereinIntroData) as LayoutBlock[]
  }) as LayoutBlock[]

  const columns = out.find((b) => b.blockType === 'columns')
  const people = out.find((b) => b.blockType === 'people')
  if (columns && people && !columns.left?.some((b) => b.blockType === 'people')) {
    out = out
      .filter((b) => b !== people)
      .map((b) => (b === columns ? { ...columns, left: [...(columns.left ?? []), people] } : b))
    changed = true
  }
  return { layout: out, changed }
}

/**
 * Convert the published /verein page, if it still has a "Verein Intro".
 * Idempotent: a converted page (or none) is left alone. Pass `req` inside a
 * migration so it runs in the migration's transaction.
 */
export async function convertVereinPage(payload: Payload, req?: PayloadRequest): Promise<boolean> {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'verein' } },
    limit: 1,
    depth: 0,
    req,
  })
  const page = docs[0]
  if (!page) return false
  const { layout, changed } = convertLayout((page.layout ?? []) as { blockType: string }[])
  if (!changed) return false
  await payload.update({
    collection: 'pages',
    id: page.id,
    req,
    depth: 0,
    context: { [EDITORIAL_SKIP]: true },
    data: { layout: layout as never, _status: 'published', reviewStatus: 'approved' } as never,
  })
  payload.logger.info('verein: /verein converted (Zwei Spalten + Werte, Menschen in the left column)')
  return true
}
