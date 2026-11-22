import type { Block } from 'payload'

/** Press — "Wir in den Medien": coverage of the Verein, newest first, and a press contact (S3.4). */
export const Press: Block = {
  slug: 'press',
  interfaceName: 'PressBlock',
  labels: { singular: 'Wir in den Medien', plural: 'Wir in den Medien' },
  fields: [
    { name: 'tag', type: 'text', label: 'Tape-Label', defaultValue: 'PRESSE' },
    { name: 'heading', type: 'text', label: 'Überschrift', defaultValue: 'Wir in den Medien' },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
    {
      name: 'items',
      type: 'array',
      label: 'Beiträge',
      labels: { singular: 'Beitrag', plural: 'Beiträge' },
      admin: {
        description:
          'Berichte über den Verein und eigene Pressemitteilungen. Die Reihenfolge ergibt sich aus dem Datum (neueste zuerst). Entweder ein Link zum Artikel oder eine hochgeladene Datei (z. B. PDF).',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'outlet', type: 'text', label: 'Medium', required: true, admin: { width: '40%' } },
            {
              name: 'date',
              type: 'date',
              label: 'Datum',
              required: true,
              admin: { width: '30%', date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
            },
          ],
        },
        { name: 'title', type: 'text', label: 'Titel', required: true },
        {
          type: 'row',
          fields: [
            { name: 'url', type: 'text', label: 'Link zum Artikel', admin: { width: '60%' } },
            { name: 'document', type: 'upload', relationTo: 'media', label: 'oder Datei', admin: { width: '40%' } },
          ],
        },
      ],
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'Presse-Kontakt (E-Mail)',
      admin: { description: 'Wird unter der Liste als Adresse für Presseanfragen gezeigt.' },
    },
  ],
}
