import type { Block } from 'payload'

/**
 * Abschnitt-Überschrift: the tape label + heading the other blocks have
 * ("GELDSPENDE · So kannst du spenden"), as a block of its own to put above
 * any section, e.g. a text block (S5.14, Falk 2026-11-26).
 */
export const SectionHeadingBlock: Block = {
  slug: 'sectionHeading',
  interfaceName: 'SectionHeadingBlock',
  labels: { singular: 'Abschnitt-Überschrift', plural: 'Abschnitt-Überschriften' },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'tag',
          type: 'text',
          label: 'Tape-Label',
          admin: { width: '35%', description: 'Kurz, in Versalien, z. B. „SACHSPENDE“.' },
        },
        {
          name: 'tagColor',
          type: 'select',
          label: 'Farbe',
          defaultValue: 'green',
          options: [
            { label: 'Grün', value: 'green' },
            { label: 'Orange', value: 'orange' },
          ],
          admin: { width: '20%' },
        },
        { name: 'heading', type: 'text', label: 'Überschrift', required: true, admin: { width: '45%' } },
      ],
    },
  ],
}
