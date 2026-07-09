import type { CollectionConfig } from 'payload'
import { checkPermission } from 'payload-rbac-plugin'
import { msbBlocks } from '../blocks'
import { slugField } from '../fields/slug'
import { generatePreviewPath } from '../lib/preview'

/** Editable pages composed from the MSB blocks (Verein / Werkzeug / Mitmachen). */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Seite', plural: 'Seiten' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status'],
    livePreview: { url: ({ data }) => generatePreviewPath({ path: `/${data?.slug}` }) },
    preview: (data) => generatePreviewPath({ path: `/${data?.slug}` }),
  },
  access: {
    read: () => true, // public frontend
    create: checkPermission('pages:create'),
    update: checkPermission('pages:update'),
    delete: checkPermission('pages:delete'),
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'layout', type: 'blocks', blocks: msbBlocks },
  ],
}
