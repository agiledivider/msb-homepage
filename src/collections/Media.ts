import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  admin: { useAsTitle: 'alt' },
  upload: {
    // MEDIA_DIR lets prod point uploads at a mounted volume (standalone builds
    // resolve import.meta paths unpredictably); falls back to public/media in dev.
    staticDir: process.env.MEDIA_DIR || path.resolve(dirname, '../../public/media'),
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1200 },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [{ name: 'alt', type: 'text', required: true }],
}
