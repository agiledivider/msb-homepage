import type { CollectionConfig } from 'payload'
import { slugField } from '../fields/slug'

/** Blog posts. The newest published post drives hero face 1. */
export const Blog: CollectionConfig = {
  slug: 'blog',
  labels: { singular: 'Blogbeitrag', plural: 'Blog' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', '_status', 'publishedAt'],
  },
  access: { read: () => true },
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
    { name: 'body', type: 'richText', label: 'Inhalt' },
  ],
}
