import type { Block } from 'payload'
import { linkField } from '../fields'

/** JoinOptions — the "Mitmachen" page: membership option cards + a location
 *  card with a map image. */
export const JoinOptions: Block = {
  slug: 'joinOptions',
  interfaceName: 'JoinOptionsBlock',
  labels: { singular: 'Join Options', plural: 'Join Options' },
  fields: [
    {
      name: 'options',
      type: 'array',
      labels: { singular: 'Option', plural: 'Options' },
      maxRows: 3,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'number', type: 'text', admin: { width: '25%' }, label: 'Number (01)' },
            { name: 'eyebrow', type: 'text', admin: { width: '45%' }, label: 'Eyebrow (AKTIV)' },
            {
              name: 'tint',
              type: 'select',
              defaultValue: 'light',
              options: [
                { label: 'Green (featured)', value: 'green' },
                { label: 'Light', value: 'light' },
              ],
              admin: { width: '30%' },
            },
          ],
        },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
        linkField('link', 'Button'),
      ],
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        { name: 'eyebrow', type: 'text', defaultValue: 'SO FINDEST DU UNS' },
        { name: 'title', type: 'text', defaultValue: 'Kennedyallee 18' },
        { name: 'line', type: 'text', label: 'Address line' },
        { name: 'transit', type: 'textarea', label: 'Transit lines' },
        { name: 'map', type: 'upload', relationTo: 'media', label: 'Map / photo' },
        { name: 'mapPlaceholder', type: 'text', defaultValue: 'Karte / Foto vom Eingang' },
      ],
    },
  ],
}
