import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CollectionConfig } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  // `filename` leads so its cell (thumbnail preview + name) is the first column.
  labels: { singular: 'Medium', plural: 'Medien' },
  folders: true,
  admin: {
    group: 'Inhalte',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'mimeType', 'uploadedByClaude', 'updatedAt'],
  },
  upload: {
    // MEDIA_DIR lets prod point uploads at a mounted volume (standalone builds
    // resolve import.meta paths unpredictably); falls back to public/media in dev.
    staticDir: process.env.MEDIA_DIR || path.resolve(dirname, '../../public/media'),
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1200 },
    ],
    // Show a preview (the 400px size) as the thumbnail in the admin list + cells.
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    {
      // Set once on upload from where the request came from, never from the body,
      // so reviewers can spot what Claude added (docs/CLAUDE-MCP.md).
      name: 'uploadedByClaude',
      type: 'checkbox',
      label: 'Von Claude hochgeladen',
      access: { create: () => false, update: () => false },
      hooks: {
        beforeChange: [
          ({ operation, req, originalDoc }) =>
            operation === 'create' ? (req.payloadAPI as string) === 'MCP' : Boolean(originalDoc?.uploadedByClaude),
        ],
      },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
