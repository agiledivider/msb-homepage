import type { Field } from 'payload'

/* -------------------------------------------------------------------------
   Pure planning for run-file-folders.ts: where a post or event belongs
   (Blog|Events / year / month) and which images belong to exactly one of them.
   ------------------------------------------------------------------------- */

const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

const BERLIN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit' })

/**
 * Folder path for a date, in Berlin time: ['Events', '2024', '05 Mai'].
 * The two-digit prefix keeps the months in calendar order when sorted by name.
 */
export function folderPath(root: string, iso: string): [string, string, string] {
  const parts = BERLIN.formatToParts(new Date(iso))
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  if (!year || !month) throw new Error(`folderPath: no date in ${JSON.stringify(iso)}`)
  return [root, year, `${month} ${MONTHS[Number(month) - 1]}`]
}

/** Names of every field (at any depth, incl. blocks) that holds a media upload. */
export function mediaFieldNames(fields: Field[], out = new Set<string>()): Set<string> {
  for (const f of fields) {
    if ((f.type === 'upload' || f.type === 'relationship') && f.relationTo === 'media' && 'name' in f) out.add(f.name)
    if ('fields' in f && Array.isArray(f.fields)) mediaFieldNames(f.fields, out)
    if (f.type === 'tabs') for (const tab of f.tabs) mediaFieldNames(tab.fields, out)
    if (f.type === 'blocks')
      for (const block of f.blocks) if (typeof block !== 'string') mediaFieldNames(block.fields, out)
  }
  return out
}

const idOf = (v: unknown): number | string | null =>
  typeof v === 'number' || typeof v === 'string'
    ? v
    : v && typeof v === 'object' && 'id' in v
      ? ((v as { id: number | string }).id ?? null)
      : null

/**
 * Every media id a document refers to: through a media field (by name, at any
 * depth, also inside rich-text block nodes) or a rich-text upload node.
 */
export function mediaRefs(doc: unknown, names: Set<string>, out = new Set<number | string>()): Set<number | string> {
  if (Array.isArray(doc)) {
    for (const item of doc) mediaRefs(item, names, out)
  } else if (doc && typeof doc === 'object') {
    const o = doc as Record<string, unknown>
    if (o.type === 'upload' && o.relationTo === 'media') {
      const id = idOf(o.value)
      if (id !== null) out.add(id)
    }
    for (const [key, value] of Object.entries(o)) {
      if (names.has(key)) {
        const id = idOf(value)
        if (id !== null) out.add(id)
      }
      if (value && typeof value === 'object') mediaRefs(value, names, out)
    }
  }
  return out
}

/** owner key → media ids it uses. Returns media id → the single owner, for media with exactly one owner. */
export function soleOwners(usage: Map<string, Set<number | string>>): Map<string, string> {
  const owners = new Map<string, Set<string>>()
  for (const [owner, ids] of usage) {
    for (const id of ids) {
      const key = String(id)
      owners.set(key, (owners.get(key) ?? new Set()).add(owner))
    }
  }
  const sole = new Map<string, string>()
  for (const [id, set] of owners) if (set.size === 1) sole.set(id, [...set][0])
  return sole
}
