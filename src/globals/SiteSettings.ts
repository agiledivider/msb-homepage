import type { GlobalConfig } from 'payload'
import { linkField } from '../blocks/fields'
import { generatePreviewPath } from '../lib/preview'

/** SiteSettings — chrome: top strip, nav, footer. Components fall back to
 *  their built-in defaults when a field is empty. */
export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  label: 'Website-Einstellungen',
  access: { read: () => true },
  admin: {
    group: 'Inhalte',
    livePreview: { url: () => generatePreviewPath({ path: '/' }) },
    preview: () => generatePreviewPath({ path: '/' }),
  },
  fields: [
    {
      name: 'topStrip',
      type: 'group',
      label: 'Info-Leiste',
      fields: [
        { name: 'status', type: 'text', defaultValue: '● GEÖFFNET · HEUTE 18:00–21:00 UHR' },
        { name: 'address', type: 'text', defaultValue: 'Kennedyallee 18 · 53175 Bonn · Tel 0228 81286980' },
      ],
    },
    {
      name: 'nav',
      type: 'array',
      label: 'Navigation',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { width: '50%' } },
            { name: 'url', type: 'text', required: true, admin: { width: '50%' } },
          ],
        },
      ],
    },
    linkField('headerCta', 'Header-Button'),
    {
      name: 'footer',
      type: 'group',
      fields: [
        { name: 'tagline', type: 'textarea' },
        { name: 'contact', type: 'textarea', admin: { description: 'Zeilenumbrüche bleiben erhalten.' } },
        {
          name: 'links',
          type: 'array',
          label: 'Footer-Links',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'label', type: 'text', required: true, admin: { width: '50%' } },
                { name: 'url', type: 'text', required: true, admin: { width: '50%' } },
              ],
            },
          ],
        },
      ],
    },
  ],
}
