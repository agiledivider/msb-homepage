import type { Block } from 'payload'

/** Prose — a plain long-form rich-text block for legal / content pages
 *  (Impressum, Datenschutz, AGB …). Renders a single readable measure column. */
export const Prose: Block = {
  slug: 'prose',
  interfaceName: 'ProseBlock',
  labels: { singular: 'Text / Prosa', plural: 'Text / Prosa' },
  fields: [{ name: 'body', type: 'richText', required: true, label: 'Text' }],
}
