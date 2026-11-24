import type { GlobalConfig } from 'payload'
import { linkField } from '../blocks/fields'
import { generatePreviewPath } from '../lib/preview'

/** HeroSettings — the editable content for hero face 0 (Werkstatt).
 *  Fields mirror the Hero `Face` contract so the value maps straight through.
 *  Tabs/rows are layout only (unnamed), so the stored shape stays flat. Tabs
 *  follow the page: text first, then buttons, photo, and the small decorations. */
export const HeroSettings: GlobalConfig = {
  slug: 'heroSettings',
  label: 'Hero (Startseite)',
  access: { read: () => true },
  admin: {
    group: 'Inhalte',
    description:
      'Die erste Seite des Karussells oben auf der Startseite. Blog- und Event-Seiten füllen sich automatisch.',
    livePreview: { url: () => generatePreviewPath({ path: '/' }) },
    preview: () => generatePreviewPath({ path: '/' }),
    components: { elements: { beforeDocumentControls: ['/components/HeroPreviewButton#HeroPreviewButton'] } },
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Text',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: 'Zeile über der Überschrift',
                  defaultValue: '◆ OFFENE WERKSTATT · BONN',
                  admin: { width: '65%' },
                },
                {
                  name: 'accent',
                  type: 'select',
                  label: 'Farbe dieser Zeile',
                  defaultValue: 'green',
                  options: [
                    { label: 'Grün', value: 'green' },
                    { label: 'Orange', value: 'orange' },
                  ],
                  admin: { width: '35%' },
                },
              ],
            },
            {
              name: 'headline',
              type: 'textarea',
              label: 'Überschrift',
              required: true,
              defaultValue: 'Bau, was du dir\nvorstellst.',
              admin: { description: 'Ein Zeilenumbruch hier ist auch auf der Seite ein Zeilenumbruch.' },
            },
            {
              name: 'lede',
              type: 'text',
              label: 'Unterzeile',
              defaultValue: 'Ein Ort zum Selbermachen — für alle in Bonn.',
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Beschreibung',
              defaultValue:
                'Löten, schweißen, fräsen, nähen, 3D-drucken. Sechs Werkstätten, über 40 Maschinen und eine Community, die mit anpackt.',
            },
          ],
        },
        {
          label: 'Buttons',
          fields: [
            linkField('primary', 'Primärer Button'),
            {
              // a lone field ignores `width`; inside a row it stays half-width
              type: 'row',
              fields: [
                {
                  name: 'primaryStyle',
                  type: 'select',
                  label: 'Farbe des primären Buttons',
                  defaultValue: 'white',
                  options: [
                    { label: 'Weiß', value: 'white' },
                    { label: 'Orange', value: 'orange' },
                  ],
                  admin: { width: '50%' },
                },
              ],
            },
            linkField('secondary', 'Sekundärer Button'),
          ],
        },
        {
          label: 'Foto',
          fields: [
            { name: 'image', type: 'upload', relationTo: 'media', label: 'Foto' },
            {
              type: 'row',
              fields: [
                {
                  name: 'caption',
                  type: 'text',
                  label: 'Bildunterschrift',
                  defaultValue: 'Werkstatt · Kennedyallee 18',
                  admin: { width: '50%' },
                },
                {
                  name: 'imagePlaceholder',
                  type: 'text',
                  label: 'Text ohne Foto',
                  defaultValue: 'Foto: Maker bei der Arbeit',
                  admin: { width: '50%', description: 'Erscheint nur, solange kein Foto gewählt ist.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Aufkleber & Details',
          description:
            'Kleine Extras rund um das Bild. Aufkleber und Notiz sind nur auf breiten Bildschirmen zu sehen.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'badge',
                  type: 'text',
                  label: 'Gelber Aufkleber (oben links)',
                  defaultValue: 'SEIT 2018',
                  admin: { width: '50%' },
                },
                {
                  name: 'note',
                  type: 'text',
                  label: 'Handschriftliche Notiz (oben rechts)',
                  defaultValue: 'Hilfe zur Selbsthilfe ✦',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'cornerLabel',
                  type: 'text',
                  label: 'Ecke der Schneidematte (unten rechts)',
                  defaultValue: '45°',
                  admin: { width: '50%' },
                },
                {
                  name: 'pillLabel',
                  type: 'text',
                  label: 'Name im Karussell-Umschalter',
                  defaultValue: 'WERKSTATT',
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
