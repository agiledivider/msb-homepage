import type { GlobalConfig } from 'payload'
import { linkField } from '../blocks/fields'
import { IcsUrlSchema } from '../lib/icsUrl'
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
      name: 'openingHours',
      type: 'group',
      label: 'Öffnungszeiten (Startseite)',
      fields: [
        {
          name: 'icsUrl',
          type: 'text',
          label: 'Kalender-Link (iCal)',
          // The secret Google address grants read access to the calendar: only CMS users see it.
          access: { read: ({ req }) => Boolean(req.user) },
          admin: {
            description:
              'Google Kalender → Einstellungen → Kalender integrieren → „Öffentliche Adresse im iCal-Format" (oder die geheime Adresse). Die Box zeigt alle Termine der nächsten 14 Tage, Änderungen nach spätestens 15 Minuten. Leer = die Zeilen unten.',
          },
          validate: (v: unknown) =>
            !v || IcsUrlSchema.safeParse(v).success ? true : 'Bitte einen https://- oder webcal://-Link angeben.',
        },
        {
          name: 'show',
          type: 'select',
          label: 'Welche Termine',
          defaultValue: 'all',
          options: [
            { label: 'Alle Termine aus dem Kalender', value: 'all' },
            {
              label: 'Nur Öffnungszeiten (Titel mit „offen", „geöffnet", „Offene Tür", „macht auf")',
              value: 'opening',
            },
          ],
          admin: { description: 'Termine mit „geschlossen" im Titel zählen nie als Öffnungszeit.' },
        },
        {
          name: 'fallback',
          type: 'array',
          label: 'Ersatz-Zeilen',
          labels: { singular: 'Zeile', plural: 'Zeilen' },
          admin: {
            description:
              'Erscheinen, wenn kein Kalender eingetragen ist, er nicht erreichbar ist oder in den nächsten 14 Tagen nichts drinsteht.',
          },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'day', type: 'text', label: 'Tag', admin: { width: '30%', placeholder: 'Mi' } },
                { name: 'note', type: 'text', label: 'Was', admin: { width: '40%', placeholder: 'Offen' } },
                { name: 'time', type: 'text', label: 'Zeit', admin: { width: '30%', placeholder: '18–21' } },
              ],
            },
            { name: 'highlight', type: 'checkbox', label: 'Hervorheben (Offene Tür)' },
          ],
        },
      ],
    },
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
