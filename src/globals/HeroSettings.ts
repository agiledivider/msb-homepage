import type { GlobalConfig } from 'payload'
import { linkField } from '../blocks/fields'
import { generatePreviewPath } from '../lib/preview'

/** HeroSettings — the editable content for hero face 0 (Werkstatt).
 *  Fields mirror the Hero `Face` contract so the value maps straight through. */
export const HeroSettings: GlobalConfig = {
  slug: 'heroSettings',
  label: 'Hero (Startseite)',
  access: { read: () => true },
  admin: {
    livePreview: { url: () => generatePreviewPath({ path: '/' }) },
    preview: () => generatePreviewPath({ path: '/' }),
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'badge', type: 'text', admin: { width: '50%' }, defaultValue: 'SEIT 2018' },
        { name: 'note', type: 'text', admin: { width: '50%' }, defaultValue: 'Hilfe zur Selbsthilfe ✦' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'eyebrow', type: 'text', admin: { width: '65%' }, defaultValue: '◆ OFFENE WERKSTATT · BONN' },
        { name: 'pillLabel', type: 'text', admin: { width: '35%' }, defaultValue: 'WERKSTATT' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'accent',
          type: 'select',
          defaultValue: 'green',
          options: [
            { label: 'Grün', value: 'green' },
            { label: 'Orange', value: 'orange' },
          ],
          admin: { width: '50%' },
        },
        { name: 'cornerLabel', type: 'text', admin: { width: '50%' }, defaultValue: '45°' },
      ],
    },
    { name: 'headline', type: 'textarea', required: true, defaultValue: 'Bau, was du dir\nvorstellst.' },
    { name: 'lede', type: 'text', defaultValue: 'A place to make things — for everyone in Bonn.' },
    {
      name: 'description',
      type: 'textarea',
      defaultValue:
        'Löten, schweißen, fräsen, nähen, 3D-drucken. Sechs Werkstätten, über 40 Maschinen und eine Community, die mit anpackt.',
    },
    {
      name: 'primaryStyle',
      type: 'select',
      defaultValue: 'white',
      options: [
        { label: 'Weiß', value: 'white' },
        { label: 'Orange', value: 'orange' },
      ],
    },
    linkField('primary', 'Primärer Button'),
    linkField('secondary', 'Sekundärer Button'),
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Foto' },
    { name: 'imagePlaceholder', type: 'text', defaultValue: 'Foto: Maker bei der Arbeit' },
    { name: 'caption', type: 'text', label: 'Foto-Bildunterschrift', defaultValue: 'Werkstatt · Kennedyallee 18' },
  ],
}
