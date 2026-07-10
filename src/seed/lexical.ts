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
