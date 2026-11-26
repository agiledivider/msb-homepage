import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { checkPermission } from 'payload-rbac-plugin'
import { publicRead } from '../access/publicRead'
import { PolaroidCard } from '../blocks/PolaroidCard/config'
import { hideFromHeroField } from '../fields/hideFromHero'
import { slugField } from '../fields/slug'
import { TITLE_MAX, titleField } from '../fields/title'
import { generatePreviewPath } from '../lib/preview'

/** Blog posts. The newest published post drives hero face 1. */
/** A CMS user's name; a Claude (MCP) API key writes as the user it belongs to. */
export const authorName = (user: unknown): string | undefined => {
  const named = (u: unknown) =>
    u && typeof u === 'object' && 'name' in u && typeof u.name === 'string' && u.name.trim() ? u.name.trim() : undefined
  if (!user || typeof user !== 'object') return undefined
  return named(user) ?? ('user' in user ? named(user.user) : undefined)
}

export const Blog: CollectionConfig = {
  slug: 'blog',
  labels: { singular: 'Blogbeitrag', plural: 'Blog' },
  folders: true,
  admin: {
    group: 'Inhalte',
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', '_status', 'publishedAt'],
    livePreview: { url: ({ data }) => generatePreviewPath({ path: `/blog/${data?.slug}` }) },
    preview: (data) => generatePreviewPath({ path: `/blog/${data?.slug}` }),
    components: { edit: { beforeDocumentControls: ['/components/HeroPreviewButton#HeroPreviewButton'] } },
  },
  access: {
    read: publicRead, // public frontend; drafts hidden from anonymous callers
    create: checkPermission('blog:create'),
    update: checkPermission('blog:update'),
    delete: checkPermission('blog:delete'),
  },
  versions: { drafts: true },
  fields: [
    titleField(TITLE_MAX.blog),
    slugField(),
    {
      name: 'legacyId',
      type: 'number',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Alte Joomla-Artikel-ID — für den 301-Redirect der alten /?view=article&id=…-URLs.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'author',
          type: 'text',
          label: 'Autor:in',
          // New posts start with the writer's CMS name (S5.13); change it for a guest post.
          defaultValue: ({ user }) => authorName(user),
          admin: { width: '50%', description: 'Wird unter dem Titel und in der Blog-Liste angezeigt.' },
        },
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
    hideFromHeroField(),
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Titelbild' },
    {
      name: 'workshops',
      type: 'relationship',
      relationTo: 'workshops',
      hasMany: true,
      label: 'Werkstätten',
      admin: { position: 'sidebar', description: 'Erscheint auf diesen Werkstatt-Seiten.' },
    },
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
