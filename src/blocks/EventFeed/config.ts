import type { Block } from 'payload'
import { linkField } from '../fields'

const tagColor = {
  name: 'tagColor',
  type: 'select' as const,
  defaultValue: 'green',
  options: [
    { label: 'Green', value: 'green' },
    { label: 'Orange', value: 'orange' },
    { label: 'Neutral', value: 'neutral' },
  ],
}

/** EventFeed — the "Pinnwand / Was läuft" feed plus the sticky info sidebar. */
export const EventFeed: Block = {
  slug: 'eventFeed',
  interfaceName: 'EventFeedBlock',
  labels: { singular: 'Event Feed + Sidebar', plural: 'Event Feeds' },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'tagLabel', type: 'text', defaultValue: 'PINNWAND', admin: { width: '33%' } },
        { name: 'heading', type: 'text', defaultValue: 'Was läuft', admin: { width: '34%' } },
      ],
    },
    linkField('allLink', 'Header "see all" link'),
    {
      name: 'events',
      type: 'array',
      labels: { singular: 'Event', plural: 'Events' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'day', type: 'text', admin: { width: '25%' }, label: 'Day (06 / 15–16)' },
            { name: 'sub', type: 'text', admin: { width: '25%' }, label: 'Sub (JUL · MO)' },
            { name: 'tag', type: 'text', admin: { width: '30%' } },
            { ...tagColor, admin: { width: '20%' } },
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
        {
          name: 'hoursTitle',
          type: 'text',
          defaultValue: 'Öffnungszeiten',
        },
        { name: 'hoursBadge', type: 'text', defaultValue: 'DIESE WOCHE' },
        {
          name: 'hours',
          type: 'array',
          labels: { singular: 'Row', plural: 'Rows' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'day', type: 'text', admin: { width: '30%' }, label: 'Do 02.' },
                { name: 'note', type: 'text', admin: { width: '40%' }, label: 'Offen' },
                { name: 'time', type: 'text', admin: { width: '30%' }, label: '18–21' },
              ],
            },
            { name: 'highlight', type: 'checkbox', label: 'Highlight (Offene Tür)' },
          ],
        },
        { name: 'hoursFootnote', type: 'textarea' },
        {
          name: 'infoEyebrow',
          type: 'text',
          defaultValue: 'NEU HIER?',
        },
        { name: 'infoText', type: 'textarea' },
        linkField('infoLink', 'Info card link'),
      ],
    },
  ],
}
