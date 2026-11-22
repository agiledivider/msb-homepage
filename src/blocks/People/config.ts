import type { Block } from 'payload'

/** People — who runs the Verein (full name + role) and how to reach each of them (S3.1). */
export const People: Block = {
  slug: 'people',
  interfaceName: 'PeopleBlock',
  labels: { singular: 'Menschen & Ansprechpartner', plural: 'Menschen & Ansprechpartner' },
  fields: [
    { name: 'tag', type: 'text', label: 'Tape-Label', defaultValue: 'VEREIN' },
    { name: 'heading', type: 'text', label: 'Überschrift', defaultValue: 'Menschen & Ansprechpartner' },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
    {
      name: 'people',
      type: 'array',
      label: 'Personen',
      labels: { singular: 'Person', plural: 'Personen' },
      admin: {
        description:
          'Vollständiger Name wie im Impressum, dazu die Rolle (z. B. Vorstand) und die Adresse, unter der man die Person erreicht.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', label: 'Name', required: true, admin: { width: '33%' } },
            { name: 'role', type: 'text', label: 'Rolle', required: true, admin: { width: '33%' } },
            { name: 'email', type: 'email', label: 'E-Mail', admin: { width: '34%' } },
          ],
        },
      ],
    },
  ],
}
