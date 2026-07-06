import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Blog } from './collections/Blog'
import { Events } from './collections/Events'
import { Pages } from './collections/Pages'
import { HeroSettings } from './globals/HeroSettings'
import { SiteSettings } from './globals/SiteSettings'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '· MakerSpace Bonn' },
  },
  editor: lexicalEditor(),
  collections: [Users, Media, Blog, Events, Pages],
  globals: [HeroSettings, SiteSettings],
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI || 'file:./msb.db' },
    push: true, // dev: auto-sync schema. Switch to migrations for production.
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
