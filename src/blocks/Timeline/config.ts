import type { Block } from 'payload'

/** Timeline — a card with dated entries, e.g. "Die kurze Geschichte" on /verein. */
export const Timeline: Block = {
  slug: 'timeline',
  interfaceName: 'TimelineBlock',
  labels: { singular: 'Zeitleiste', plural: 'Zeitleisten' },
  fields: [
    { name: 'title', type: 'text', label: 'Titel', defaultValue: 'DIE KURZE GESCHICHTE' },
    {
      name: 'items',
      type: 'array',
      label: 'Einträge',
      labels: { singular: 'Eintrag', plural: 'Einträge' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'year', type: 'text', label: 'Jahr', admin: { width: '25%' } },
            { name: 'text', type: 'textarea', label: 'Text', admin: { width: '75%' } },
          ],
        },
      ],
    },
  ],
}
