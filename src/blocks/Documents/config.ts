import type { Block } from 'payload'

/** Documents — the Verein's Satzung, Ordnungen and Gemeinnützigkeit proof as files, each with its version (S3.3). */
export const Documents: Block = {
  slug: 'documents',
  interfaceName: 'DocumentsBlock',
  labels: { singular: 'Dokumente', plural: 'Dokumente' },
  fields: [
    { name: 'tag', type: 'text', label: 'Tape-Label', defaultValue: 'DOKUMENTE' },
    { name: 'heading', type: 'text', label: 'Überschrift', defaultValue: 'Satzung & Ordnungen' },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
    {
      name: 'items',
      type: 'array',
      label: 'Dokumente',
      labels: { singular: 'Dokument', plural: 'Dokumente' },
      admin: {
        description:
          'Satzung, Hausordnung, Beitragsordnung, Nachweis der Gemeinnützigkeit … in dieser Reihenfolge angezeigt. Für eine neue Fassung die Datei in der Mediathek ersetzen (dann bleiben alle Links gültig) oder hier eine neue Datei wählen, und den Stand anpassen.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', label: 'Titel', required: true, admin: { width: '50%' } },
            {
              name: 'version',
              type: 'text',
              label: 'Stand / Fassung',
              required: true,
              admin: { width: '50%', placeholder: 'z. B. beschlossen am 17.06.2023' },
            },
          ],
        },
        { name: 'document', type: 'upload', relationTo: 'media', label: 'Datei', required: true },
      ],
    },
  ],
}
