import type { Block } from 'payload'
import { linkField } from '../fields'

/**
 * Hero — the tilted 3D "cutting-mat" prism that auto-flips between up to three
 * faces. Each face is a full slide (Werkstatt / Blog / Event in the original).
 */
export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero (Prism)', plural: 'Heroes (Prism)' },
  fields: [
    {
      name: 'faces',
      type: 'array',
      label: 'Faces',
      minRows: 1,
      maxRows: 3,
      admin: { description: 'Up to three slides. The prism rotates through them.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'badge', type: 'text', label: 'Corner badge', admin: { width: '50%' } },
            { name: 'note', type: 'text', label: 'Handwritten note', admin: { width: '50%' } },
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
                { label: 'Green', value: 'green' },
                { label: 'Orange', value: 'orange' },
              ],
              admin: { width: '50%', description: 'Eyebrow / accent tint.' },
            },
            {
              name: 'variant',
              type: 'select',
              defaultValue: 'standard',
              options: [
                { label: 'Standard', value: 'standard' },
                { label: 'Event (big date)', value: 'event' },
              ],
              admin: { width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'eyebrow', type: 'text', label: 'Eyebrow', admin: { width: '65%' } },
            { name: 'pillLabel', type: 'text', label: 'Nav pill label', admin: { width: '35%' } },
          ],
        },
        {
          name: 'cornerLabel',
          type: 'text',
          label: 'Corner label',
          admin: { description: 'Small mono note in the mat corner, e.g. "45°" or "#42".' },
        },
        // Event-variant date block
        {
          type: 'collapsible',
          label: 'Event date (event variant only)',
          admin: { condition: (_, s) => s?.variant === 'event' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'eventDay', type: 'text', admin: { width: '33%' }, label: 'Day (06)' },
                { name: 'eventMonth', type: 'text', admin: { width: '33%' }, label: 'Month (JULI)' },
                { name: 'eventWeekday', type: 'text', admin: { width: '34%' }, label: 'Weekday (MONTAG)' },
              ],
            },
          ],
        },
        {
          name: 'headline',
          type: 'textarea',
          required: true,
          admin: { description: 'Line breaks are preserved.' },
        },
        { name: 'lede', type: 'text', label: 'Lede (italic subtitle)' },
        { name: 'description', type: 'textarea' },
        {
          name: 'meta',
          type: 'array',
          label: 'Meta chips (byline / date / read time)',
          admin: { description: 'Rendered inline, dot-separated.' },
          fields: [{ name: 'value', type: 'text' }],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'primaryStyle',
              type: 'select',
              defaultValue: 'white',
              options: [
                { label: 'White', value: 'white' },
                { label: 'Orange', value: 'orange' },
              ],
              admin: { width: '100%', description: 'Primary button fill.' },
            },
          ],
        },
        linkField('primary', 'Primary button'),
        linkField('secondary', 'Secondary button'),
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Photo' },
        { name: 'imagePlaceholder', type: 'text', label: 'Photo placeholder text' },
        { name: 'caption', type: 'text', label: 'Photo caption (handwritten)' },
      ],
    },
  ],
}
