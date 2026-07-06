import type { Block } from 'payload'
import { linkField } from '../fields'

/** EventsList — the full Events page: a dense date list plus a sidebar of
 *  larger events and a "new here?" card. */
export const EventsList: Block = {
  slug: 'eventsList',
  interfaceName: 'EventsListBlock',
  labels: { singular: 'Events List', plural: 'Events Lists' },
  fields: [
    {
      name: 'events',
      type: 'array',
      labels: { singular: 'Event', plural: 'Events' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'day', type: 'text', admin: { width: '20%' }, label: 'Day (06)' },
            { name: 'sub', type: 'text', admin: { width: '20%' }, label: 'Sub (JUL · MO)' },
            { name: 'tag', type: 'text', admin: { width: '30%' } },
            {
              name: 'tagColor',
              type: 'select',
              defaultValue: 'green',
              options: [
                { label: 'Green', value: 'green' },
                { label: 'Orange', value: 'orange' },
                { label: 'Neutral', value: 'neutral' },
              ],
              admin: { width: '15%' },
            },
            { name: 'time', type: 'text', admin: { width: '15%' }, label: 'Time (ab 10)' },
          ],
        },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
        linkField('link', 'Links to'),
      ],
    },
    {
      name: 'sidebar',
      type: 'group',
      fields: [
        { name: 'bigTitle', type: 'text', defaultValue: 'GRÖSSERE EVENTS' },
        {
          name: 'bigEvents',
          type: 'array',
          labels: { singular: 'Big event', plural: 'Big events' },
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'meta', type: 'text' },
          ],
        },
        { name: 'infoTitle', type: 'text', defaultValue: 'Neu hier?' },
        { name: 'infoText', type: 'textarea' },
        linkField('infoLink', 'Info link'),
      ],
    },
  ],
}
