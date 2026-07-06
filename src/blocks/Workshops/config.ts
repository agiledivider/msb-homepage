import type { Block } from 'payload'
import { linkField } from '../fields'

/**
 * Workshops — the pegboard wall of workshop cards.
 *  - variant "preview": 3-up compact cards (Start-page teaser)
 *  - variant "detailed": 2-up cards with longer copy (Tools page)
 */
export const Workshops: Block = {
  slug: 'workshops',
  interfaceName: 'WorkshopsBlock',
  labels: { singular: 'Workshops (Pegboard)', plural: 'Workshops' },
  fields: [
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'preview',
      options: [
        { label: 'Preview (3 columns)', value: 'preview' },
        { label: 'Detailed (2 columns)', value: 'detailed' },
      ],
    },
    // optional inline section heading (used by the Start teaser)
    {
      type: 'collapsible',
      label: 'Inline section heading (optional)',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'tagLabel', type: 'text', admin: { width: '40%' } },
            {
              name: 'tagColor',
              type: 'select',
              defaultValue: 'orange',
              options: [
                { label: 'Green', value: 'green' },
                { label: 'Orange', value: 'orange' },
              ],
              admin: { width: '20%' },
            },
            { name: 'heading', type: 'text', admin: { width: '40%' } },
          ],
        },
        linkField('allLink', '"See all" link'),
        { name: 'note', type: 'text', label: 'Handwritten note (top-right)' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Workshop', plural: 'Workshops' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'code', type: 'text', admin: { width: '40%' }, label: 'Code (A1 / A1 · ELEKTRONIK)' },
            { name: 'title', type: 'text', required: true, admin: { width: '60%' } },
          ],
        },
        { name: 'desc', type: 'textarea' },
      ],
    },
    { name: 'footnote', type: 'text', label: 'Footnote (detailed variant)' },
  ],
}
