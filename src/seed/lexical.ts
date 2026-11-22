/* -------------------------------------------------------------------------
   Minimal Lexical rich-text builders for seeding legal / prose pages.
   Covers headings, paragraphs, bold, links, line breaks and bullet lists —
   enough for Impressum / Datenschutz / Haftung. Shared by the seed modules.
   ------------------------------------------------------------------------- */
export type Node = Record<string, unknown>

/** Inline text run; `bold` sets the Lexical bold format bit. */
export const t = (text: string, bold = false): Node => ({
  type: 'text',
  text,
  format: bold ? 1 : 0,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})

/** Hard line break inside a paragraph. */
export const br = (): Node => ({ type: 'linebreak', version: 1 })

/** Custom link (opens in a new tab). */
export const a = (text: string, url: string): Node => ({
  type: 'link',
  version: 3,
  fields: { linkType: 'custom', url, newTab: true },
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [t(text)],
})

export const p = (...children: Node[]): Node => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  textFormat: 0,
  children,
})

const heading = (tag: 'h2' | 'h3', text: string): Node => ({
  type: 'heading',
  tag,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children: [t(text)],
})
export const h2 = (text: string): Node => heading('h2', text)
export const h3 = (text: string): Node => heading('h3', text)

/** Unordered list from plain strings. */
export const ul = (items: string[]): Node => ({
  type: 'list',
  listType: 'bullet',
  tag: 'ul',
  start: 1,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children: items.map((text, i) => ({
    type: 'listitem',
    value: i + 1,
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [t(text)],
  })),
})

/** Wrap block nodes into a Lexical editor-state document. */
export const doc = (children: Node[]) => ({
  root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr' as const, children },
})

/** Parse inline markdown links [label](url) in a plain string into text/link nodes. */
export const inline = (text: string): Node[] => {
  const nodes: Node[] = []
  let last = 0
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const idx = m.index ?? 0
    if (idx > last) nodes.push(t(text.slice(last, idx)))
    nodes.push(a(m[1], m[2]))
    last = idx + m[0].length
  }
  if (last < text.length) nodes.push(t(text.slice(last)))
  return nodes.length ? nodes : [t(text)]
}

/** Compact block shape used by the legacy-article seed data. */
export type LegacyBlock = { p: string } | { h2: string } | { ul: string[] } | { img: string; alt?: string }

/**
 * Convert compact legacy blocks (with inline markdown links) into a Lexical doc.
 * Image blocks become upload nodes; `mediaIds` maps their filename to the media
 * doc (images without an entry are left out).
 */
export const legacyBodyToLexical = (body: LegacyBlock[], mediaIds: Record<string, number | string> = {}) =>
  doc(
    body.flatMap((b): Node[] => {
      if ('img' in b) {
        const value = mediaIds[b.img]
        return value === undefined
          ? []
          : [{ type: 'upload', version: 3, format: '', id: `img-${b.img}`, fields: null, relationTo: 'media', value }]
      }
      if ('h2' in b) return [h2(b.h2)]
      if ('ul' in b) {
        return [
          {
            type: 'list',
            listType: 'bullet',
            tag: 'ul',
            start: 1,
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr',
            children: b.ul.map((it, i) => ({
              type: 'listitem',
              value: i + 1,
              format: '',
              indent: 0,
              version: 1,
              direction: 'ltr',
              children: inline(it),
            })),
          },
        ]
      }
      return [p(...inline(b.p))]
    }),
  )

/** Paragraphs that make a poor teaser: a bare date line or a photo credit (common in the old archive). */
const NOT_A_LEAD = /^(\d{1,2}\.\d{1,2}\.\d{2,4}\s*$|photo by |foto: |bild: |bildrechte)/i

/** First real paragraph, stripped of markdown links, truncated — for excerpt / meta description. */
export const firstParagraphText = (body: LegacyBlock[], max = 180): string => {
  const strip = (s: string) => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').trim()
  const paragraphs = body.flatMap((b) => ('p' in b ? [strip(b.p)] : []))
  const plain = paragraphs.find((p) => !NOT_A_LEAD.test(p)) ?? paragraphs[0]
  if (!plain) return ''
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}
