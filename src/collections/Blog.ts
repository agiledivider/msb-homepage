import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { checkPermission } from 'payload-rbac-plugin'
import { PolaroidCard } from '../blocks/PolaroidCard/config'
import { slugField } from '../fields/slug'
import { generatePreviewPath } from '../lib/preview'

/** Blog posts. The newest published post drives hero face 1. */
export const Blog: CollectionConfig = {
  slug: 'blog',
  labels: { singular: 'Blogbeitrag', plural: 'Blog' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', '_status', 'publishedAt'],
    livePreview: { url: ({ data }) => generatePreviewPath({ path: `/blog/${data?.slug}` }) },
    preview: (data) => generatePreviewPath({ path: `/blog/${data?.slug}` }),
    components: { edit: { beforeDocumentControls: ['/components/HeroPreviewButton#HeroPreviewButton'] } },
  },
  access: {
    read: () => true, // public frontend
    create: checkPermission('blog:create'),
    update: checkPermission('blog:update'),
    delete: checkPermission('blog:delete'),
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    {
      type: 'row',
      fields: [
        { name: 'author', type: 'text', admin: { width: '50%' } },
        {
          name: 'readingTime',
          type: 'text',
          admin: { width: '50%', description: 'z. B. "6 MIN"' },
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
      hooks: {
        // stamp on first publish if left empty
        beforeChange: [
          ({ value, siblingData }) => {
            if (!value && siblingData?._status === 'published') return new Date()
            return value
          },
        ],
      },
    },
    { name: 'subtitle', type: 'text', label: 'Untertitel (kursive Zeile im Hero)' },
    { name: 'excerpt', type: 'textarea', label: 'Anrisstext' },
    { name: 'badge', type: 'text', label: 'Hero-Badge', defaultValue: 'NEU IM BLOG' },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Titelbild' },
    {
      name: 'body',
      type: 'richText',
      label: 'Inhalt',
      // Extend the default editor with an insertable Polaroid block.
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [PolaroidCard] })],
      }),
    },
  ],
}
