import type { Payload } from 'payload'
import { isToolIcon } from '../blocks/Workshops/icons'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'

/**
 * The six workshops as documents (S10.1). Idempotent: does nothing once any
 * workshop exists, so editor changes are never overwritten.
 *
 * Source, in order: the cards an editor already filled in on the /werkzeug page
 * (verb line, tool drawing), else the defaults below. Every machine starts as
 * "nach Einweisung", what the site has always said; the Werkstattpat:innen
 * correct it per machine.
 */
const DEFAULTS = [
  {
    slug: 'elektronik',
    title: 'Elektronik & Löten',
    icon: 'loetkolben',
    verbs: 'Löten, messen, reparieren',
    summary: 'Lötstationen · Oszilloskope · Reflowofen',
    machines: ['3 Lötstationen', 'Oszilloskope', 'Labornetzteile', 'Reflowofen', 'Breadboards'],
  },
  {
    slug: 'metall',
    title: 'Metallwerkstatt',
    icon: 'schluessel',
    verbs: 'Schweißen, drehen, biegen',
    summary: 'Schweißgerät · Drehmaschine · Bandsäge',
    machines: ['Schweißgerät MIG/MAG Puls (AC/DC)', 'Metallbandsäge', 'Abkantbank', 'Drehmaschine', 'Tischfräse'],
  },
  {
    slug: 'holz',
    title: 'Holzwerkstatt',
    icon: 'saege',
    verbs: 'Zuschneiden, Möbel bauen',
    summary: 'Formatkreissäge · Absauganlage',
    machines: ['Formatkreissäge', 'Kreissäge', 'Absauganlage'],
  },
  {
    slug: 'textil',
    title: 'Textil & Handarbeit',
    icon: 'schere',
    verbs: 'Nähen, sticken, plotten',
    summary: 'Nähmaschinen · Stickmaschine · Folienplotter',
    machines: ['Nähmaschinen', 'Stickmaschine', 'Strickmaschine', 'Folienplotter'],
  },
  {
    slug: '3d-druck',
    title: '3D-Druck',
    icon: 'spule',
    verbs: 'Drucken nach eigener Datei',
    summary: '3D-Drucker',
    machines: ['3D-Drucker'],
  },
  {
    slug: 'laser-cnc',
    title: 'Laser & CNC',
    icon: 'laser',
    verbs: 'Lasern, gravieren, fräsen',
    summary: 'Lasercutter · Yeti Smartbench CNC-Fräse',
    machines: ['Lasercutter', 'Yeti-Smartbench CNC-Fräse'],
  },
] as const

type PageItem = { title?: string | null; verbs?: string | null; icon?: string | null }

/** Cards from the /werkzeug page's workshop wall, keyed by title. */
async function cardsOnWerkzeugPage(payload: Payload): Promise<Map<string, PageItem>> {
  const res = await payload.find({ collection: 'pages', where: { slug: { equals: 'werkzeug' } }, limit: 1, depth: 0 })
  const layout = (res.docs[0]?.layout ?? []) as Array<{ blockType?: string; items?: PageItem[] | null }>
  const items = layout.find((b) => b.blockType === 'workshops')?.items ?? []
  return new Map(items.filter((i) => i.title).map((i) => [i.title as string, i]))
}

export async function upsertWorkshops(payload: Payload): Promise<void> {
  const { totalDocs } = await payload.find({ collection: 'workshops', limit: 0 })
  if (totalDocs > 0) return

  const cards = await cardsOnWerkzeugPage(payload)
  for (const [i, d] of DEFAULTS.entries()) {
    const card = cards.get(d.title)
    const icon = isToolIcon(card?.icon) ? card.icon : d.icon
    await payload.create({
      collection: 'workshops',
      context: { [EDITORIAL_SKIP]: true },
      data: {
        title: d.title,
        slug: d.slug,
        order: (i + 1) * 10,
        icon,
        verbs: card?.verbs || d.verbs,
        summary: d.summary,
        machines: d.machines.map((name) => ({ name, access: 'briefing' as const })),
        _status: 'published',
        reviewStatus: 'approved',
      } as never,
    })
  }
  payload.logger.info(`workshops: created ${DEFAULTS.length} (from the /werkzeug cards where present)`)
}
