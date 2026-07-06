import type { Block } from 'payload'

/** VereinIntro — the two-column "about" body: prose + pull quote, a history
 *  timeline card, and a row of value cards. */
export const VereinIntro: Block = {
  slug: 'vereinIntro',
  interfaceName: 'VereinIntroBlock',
  labels: { singular: 'Verein Intro', plural: 'Verein Intros' },
  fields: [
    { name: 'body', type: 'richText', label: 'Body prose' },
    { name: 'quote', type: 'textarea', label: 'Pull quote' },
    {
      name: 'timelineTitle',
      type: 'text',
      defaultValue: 'DIE KURZE GESCHICHTE',
    },
    {
      name: 'timeline',
      type: 'array',
      labels: { singular: 'Milestone', plural: 'Milestones' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'year', type: 'text', admin: { width: '25%' } },
            { name: 'text', type: 'textarea', admin: { width: '75%' } },
          ],
        },
      ],
    },
    {
      name: 'values',
      type: 'array',
      labels: { singular: 'Value card', plural: 'Value cards' },
      maxRows: 3,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ],
    },
  ],
}
