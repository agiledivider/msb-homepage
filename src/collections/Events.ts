import type { CollectionConfig } from 'payload'
import { checkPermission } from 'payload-rbac-plugin'
import { publicRead } from '../access/publicRead'
import { slugField } from '../fields/slug'
import { TITLE_MAX, titleField } from '../fields/title'
import { generatePreviewPath } from '../lib/preview'

/** Events. The next upcoming event drives hero face 2; the collection also
 *  feeds the Start "Was läuft" feed and the /events list. */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Event', plural: 'Events' },
  folders: true,
  admin: {
    group: 'Inhalte',
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'category', '_status'],
    livePreview: { url: ({ data }) => generatePreviewPath({ path: `/events/${data?.slug}` }) },
    preview: (data) => generatePreviewPath({ path: `/events/${data?.slug}` }),
    components: { edit: { beforeDocumentControls: ['/components/HeroPreviewButton#HeroPreviewButton'] } },
  },
  access: {
    read: publicRead, // public frontend; drafts hidden from anonymous callers
    create: checkPermission('events:create'),
    update: checkPermission('events:update'),
    delete: checkPermission('events:delete'),
  },
  versions: { drafts: true },
  // Layout only: rows and labels, no named groups, so the stored shape is unchanged.
  fields: [
    titleField(TITLE_MAX.events),
    {
      name: 'subtitle',
      type: 'text',
      label: 'Untertitel',
      admin: {
        description: 'Kursive Zeile unter dem Titel: auf der Event-Seite, im Startseiten-Karussell und in den Listen.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'date',
          type: 'date',
          label: 'Datum',
          required: true,
          // Date only — the time of day is derived from `timeLabel` (see lib/eventTime.ts).
          admin: { width: '50%', date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
        {
          name: 'endDate',
          type: 'date',
          label: 'Enddatum',
          admin: {
            width: '50%',
            description: 'Nur bei mehrtägigen Events.',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'timeLabel',
          type: 'text',
          label: 'Uhrzeit',
          admin: { width: '50%', description: 'Freitext, z. B. „ab 10" oder „18–21".' },
        },
        { name: 'location', type: 'text', label: 'Ort', admin: { width: '50%' }, defaultValue: 'Kennedyallee 18' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'text',
          label: 'Etikett',
          admin: { width: '50%', description: 'Farbiges Etikett in Liste und Kacheln, z. B. „FÜR ALLE · KOSTENLOS".' },
        },
        {
          name: 'tagColor',
          type: 'select',
          label: 'Farbe des Etiketts',
          defaultValue: 'green',
          options: [
            { label: 'Grün', value: 'green' },
            { label: 'Orange', value: 'orange' },
            { label: 'Neutral', value: 'neutral' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    {
      name: 'workshops',
      type: 'relationship',
      relationTo: 'workshops',
      hasMany: true,
      label: 'Werkstätten',
      admin: { position: 'sidebar', description: 'Erscheint auf diesen Werkstatt-Seiten.' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Kurzbeschreibung',
      admin: { description: 'Erscheint in Liste und Kacheln und, beim nächsten Event, im Startseiten-Karussell.' },
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Details',
      admin: { description: 'Der ausführliche Text auf der Seite des Events.' },
    },
    slugField(),
    {
      name: 'legacyId',
      type: 'number',
      label: 'Alte Joomla-ID',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Leitet die alte Joomla-Adresse auf dieses Event um.',
        // Only imported events carry one; nobody sets it by hand.
        condition: (data) => typeof data?.legacyId === 'number',
      },
    },
  ],
}
