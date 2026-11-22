import type { Block } from 'payload'

/** Quote — a pull quote with the green bar; German quotation marks are added automatically. */
export const Quote: Block = {
  slug: 'quote',
  interfaceName: 'QuoteBlock',
  labels: { singular: 'Zitat', plural: 'Zitate' },
  fields: [
    {
      name: 'text',
      type: 'textarea',
      label: 'Zitat',
      required: true,
      admin: { description: 'Ohne Anführungszeichen; „…“ setzt die Seite selbst.' },
    },
  ],
}
