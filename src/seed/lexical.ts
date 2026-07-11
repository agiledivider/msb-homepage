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
export type LegacyBlock = { p: string } | { h2: string } | { ul: string[] }

/** Convert compact legacy blocks (with inline markdown links) into a Lexical doc. */
export const legacyBodyToLexical = (body: LegacyBlock[]) =>
  doc(
    body.map((b) => {
      if ('h2' in b) return h2(b.h2)
      if ('ul' in b) {
        return {
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
        }
      }
      return p(...inline(b.p))
    }),
  )

/** First paragraph, stripped of markdown links, truncated — for excerpt / meta description. */
export const firstParagraphText = (body: LegacyBlock[], max = 180): string => {
  const first = body.find((b) => 'p' in b) as { p: string } | undefined
  if (!first) return ''
  const plain = first.p.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').trim()
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}
