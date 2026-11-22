import type { Block } from 'payload'

/** Values — a row of short cards (title + text), e.g. "Für alle · Hilfe zur Selbsthilfe · Wissen teilen". */
export const Values: Block = {
  slug: 'values',
  interfaceName: 'ValuesBlock',
  labels: { singular: 'Werte', plural: 'Werte' },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Karten',
      labels: { singular: 'Karte', plural: 'Karten' },
      maxRows: 6,
      fields: [
        { name: 'title', type: 'text', label: 'Titel', required: true },
        { name: 'text', type: 'textarea', label: 'Text' },
      ],
    },
  ],
}
