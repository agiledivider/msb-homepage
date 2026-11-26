/**
 * Text handling for the site search (S5.17): German-aware normalising, query
 * terms, plain text out of rich text and blocks, and highlighted snippets.
 * Pure functions, no Payload: the index (./index.ts) feeds them documents.
 */

/** One piece of displayed text; `hit` pieces are drawn with the highlighter. */
export type Segment = { text: string; hit: boolean }

/**
 * Lower case, umlauts as their two-letter spelling, ß as ss, other accents
 * dropped. "Löten", "LOETEN" and "loeten" all become "loeten".
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

/** The query's words (normalised, at least 2 characters, at most 8). */
export function queryTerms(q: string): string[] {
  const words = normalize(q)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2)
  return [...new Set(words)].slice(0, 8)
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A regex that finds a normalised term in the *original* text: "loeten" also
 * matches "löten", "ss" also "ß". Case-insensitive.
 */
export function termPattern(term: string): string {
  return escapeRe(term)
    .replace(/ae/g, '(?:ae|ä)')
    .replace(/oe/g, '(?:oe|ö)')
    .replace(/ue/g, '(?:ue|ü)')
    .replace(/ss/g, '(?:ss|ß)')
}

/** Shortest term that also matches inside a word; shorter ones only at a word start. Scoring uses the same rule. */
export const MIN_INFIX = 4

const termRegexPart = (t: string) => (t.length < MIN_INFIX ? `(?<![\\p{L}\\p{N}])${termPattern(t)}` : termPattern(t))

const termsRegex = (terms: string[]) => (terms.length ? new RegExp(terms.map(termRegexPart).join('|'), 'giu') : null)

/** Split text into plain and highlighted segments for every term. */
export function highlight(text: string, terms: string[]): Segment[] {
  const re = termsRegex(terms)
  if (!re || !text) return text ? [{ text, hit: false }] : []
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0
    if (!m[0]) continue
    if (at > last) out.push({ text: text.slice(last, at), hit: false })
    out.push({ text: m[0], hit: true })
    last = at + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false })
  return out
}

/**
 * About `length` characters of `text` around the first term found, cut at
 * word boundaries, with "…" where it was cut, then highlighted. Without a hit:
 * the start of the text.
 */
export function snippet(text: string, terms: string[], length = 160, before = Math.floor(length / 3)): Segment[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const re = termsRegex(terms)
  const at = re ? (clean.search(re) ?? -1) : -1
  let start = at > before ? at - before : 0
  if (start > 0) {
    const space = clean.indexOf(' ', start)
    start = space > 0 && space < at ? space + 1 : start
  }
  let end = Math.min(clean.length, start + length)
  if (end < clean.length) {
    const space = clean.lastIndexOf(' ', end)
    end = space > start ? space : end
  }
  const body = clean.slice(start, end)
  const segs = highlight(body, terms)
  if (start > 0) segs.unshift({ text: '…', hit: false })
  if (end < clean.length) segs.push({ text: ' …', hit: false })
  return segs
}

/** Keys whose string values are readable text in blocks and rich text. */
const TEXT_KEYS = new Set([
  'text',
  'title',
  'heading',
  'headline',
  'subtitle',
  'lede',
  'description',
  'excerpt',
  'summary',
  'verbs',
  'promise',
  'label',
  'caption',
  'coverCaption',
  'quote',
  'name',
  'role',
  'meta',
  'tag',
  'where',
  'hours',
  'cost',
  'outlet',
  'body',
  'note',
  'intro',
])

/**
 * All readable text in a value: Lexical rich text (its `text` nodes) and page
 * blocks (their text fields), skipping ids, links, colours and other settings.
 */
export function plainText(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) plainText(v, out)
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'string') {
        // `tag` is a tape label in blocks but an HTML tag (ul, h2) in rich text.
        const markup = k === 'tag' && /^(h[1-6]|ul|ol|li|p|blockquote)$/.test(v)
        if (TEXT_KEYS.has(k) && v.trim() && !markup && !/^https?:\/\//.test(v)) out.push(v.trim())
      } else if (v && typeof v === 'object') {
        plainText(v, out)
      }
    }
  }
  return out
}
