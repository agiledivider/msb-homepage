import type { Block } from 'payload'

/** Supporters — who backs the Verein now, and separately who did earlier; logos link to them (S3.2). */
export const Supporters: Block = {
  slug: 'supporters',
  interfaceName: 'SupportersBlock',
  labels: { singular: 'Förderer', plural: 'Förderer' },
  fields: [
    { name: 'tag', type: 'text', label: 'Tape-Label', defaultValue: 'DANKE' },
    { name: 'heading', type: 'text', label: 'Überschrift', defaultValue: 'Unsere Förderer' },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
    { name: 'formerHeading', type: 'text', label: 'Überschrift frühere Förderer', defaultValue: 'Frühere Förderer' },
    {
      name: 'supporters',
      type: 'array',
      label: 'Förderer',
      labels: { singular: 'Förderer', plural: 'Förderer' },
      admin: {
        description:
          'Aktuelle Förderer stehen oben, alle anderen unter „Frühere Förderer“. Logos am besten als SVG oder PNG mit transparentem Hintergrund: die Seite zeigt sie einfarbig und erst beim Darüberfahren in ihren eigenen Farben. Ohne Logo erscheint der Name.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', label: 'Name', required: true, admin: { width: '50%' } },
            { name: 'url', type: 'text', label: 'Link', admin: { width: '50%', placeholder: 'https://…' } },
          ],
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Text',
          admin: { description: 'Optional: was dieser Förderer für uns tut. Steht neben dem Logo.' },
        },
        {
          type: 'row',
          fields: [
            { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo', admin: { width: '50%' } },
            {
              name: 'current',
              type: 'checkbox',
              label: 'Fördert uns aktuell',
              defaultValue: true,
              admin: { width: '50%', style: { alignSelf: 'center' } },
            },
          ],
        },
      ],
    },
  ],
}
