import type { CollectionConfig } from 'payload'
import { checkPermission } from 'payload-rbac-plugin'
import { slugField } from '../fields/slug'
import { generatePreviewPath } from '../lib/preview'

/** Events. The next upcoming event drives hero face 2; the collection also
 *  feeds the Start "Was läuft" feed and the /events list. */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Event', plural: 'Events' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'category', '_status'],
    livePreview: { url: ({ data }) => generatePreviewPath({ path: `/events/${data?.slug}` }) },
    preview: (data) => generatePreviewPath({ path: `/events/${data?.slug}` }),
    components: { edit: { beforeDocumentControls: ['/components/HeroPreviewButton#HeroPreviewButton'] } },
  },
  access: {
    read: () => true, // public frontend
    create: checkPermission('events:create'),
    update: checkPermission('events:update'),
    delete: checkPermission('events:delete'),
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    {
      type: 'row',
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
          // Date only — the time of day is derived from `timeLabel` (see lib/eventTime.ts).
          admin: { width: '50%', date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
        {
          name: 'endDate',
          type: 'date',
          label: 'Enddatum (optional, mehrtägig)',
          admin: { width: '50%', date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'timeLabel',
          type: 'text',
          label: 'Zeit-Label',
          admin: { width: '33%', description: 'z. B. "ab 10", "18–21"' },
        },
        { name: 'location', type: 'text', admin: { width: '67%' }, defaultValue: 'Kennedyallee 18' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'text',
          label: 'Tag/Label',
          admin: { width: '60%', description: 'z. B. "FÜR ALLE · KOSTENLOS"' },
        },
        {
          name: 'tagColor',
          type: 'select',
          defaultValue: 'green',
          options: [
            { label: 'Grün', value: 'green' },
            { label: 'Orange', value: 'orange' },
            { label: 'Neutral', value: 'neutral' },
          ],
          admin: { width: '40%' },
        },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    { name: 'description', type: 'textarea', label: 'Kurzbeschreibung' },
    { name: 'body', type: 'richText', label: 'Details' },
  ],
}
