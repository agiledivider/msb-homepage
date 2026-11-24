import type { GlobalConfig } from 'payload'
import { linkField } from '../blocks/fields'
import { generatePreviewPath } from '../lib/preview'
import { SOCIAL_PLATFORMS } from '../lib/socialPlatforms'

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
        { name: 'tagline', type: 'textarea', label: 'Claim', admin: { description: 'Kurzer Satz unter dem Logo.' } },
        {
          type: 'row',
          fields: [
            {
              name: 'phone',
              type: 'text',
              label: 'Telefon',
              admin: { width: '50%', description: 'Wie angezeigt, z. B. 0228 81286980.' },
            },
            { name: 'email', type: 'email', label: 'E-Mail', admin: { width: '50%' } },
          ],
        },
        {
          name: 'social',
          type: 'array',
          label: 'Community',
          labels: { singular: 'Kanal', plural: 'Kanäle' },
          admin: { description: 'Chats und Kanäle, als Icons im Footer. Leer = nichts anzeigen.' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  label: 'Plattform',
                  required: true,
                  options: SOCIAL_PLATFORMS.map((p) => ({ label: p.label, value: p.value })),
                  admin: { width: '35%' },
                },
                {
                  name: 'url',
                  type: 'text',
                  label: 'Link',
                  required: true,
                  admin: { width: '65%', description: 'Einladungs- oder Profil-Link, beginnt mit https://' },
                  validate: (v: unknown) =>
                    typeof v === 'string' && /^https:\/\/\S+$/.test(v) ? true : 'Bitte einen https://-Link angeben.',
                },
              ],
            },
          ],
        },
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
