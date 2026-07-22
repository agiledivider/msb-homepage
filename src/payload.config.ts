import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { Field } from 'payload'
import { buildConfig } from 'payload'
import { rbac } from 'payload-rbac-plugin'
import sharp from 'sharp'
import { adminOnly, hideForNonAdmins } from './access/admin'
import { Blog } from './collections/Blog'
import { Events } from './collections/Events'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'
import { HeroSettings } from './globals/HeroSettings'
import { SiteSettings } from './globals/SiteSettings'
import { editorialWorkflow } from './plugins/editorial'
import { sitePublishing } from './plugins/publish'
import { isAdmin } from './plugins/editorial/access'

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
    // Push works against a clean DB (drift-free). If it ever aborts on an
    // "index already exists" error, the schema has drifted — recreate msb.db and
    // re-seed, or move to migrations (payload migrate) for production.
    push: true,
  }),
  plugins: [
    editorialWorkflow({
      collections: ['blog', 'events', 'pages'],
      // fields only reviewers may edit (editors see them locked)
      lockedFields: { blog: ['publishedAt'] },
    }),
    // Publish the static site from the admin (button + auto-publish on change).
    // The build runs in the separate publisher container; see docs/PUBLISHING.md.
    sitePublishing({ collections: ['blog', 'events', 'pages'] }),
    // UI-configurable roles & permissions (Roles + Permissions collections).
    // Locked to admins so the permission system can't be edited by others.
    rbac({
      enabled: true,
      rolesAccess: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
      permissionsAccess: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
      hideRoles: hideForNonAdmins,
      hidePermissions: hideForNonAdmins,
    }),
    // The RBAC `roles` field ships without field access — lock its editing to
    // admins so a self-service update can't grant roles (privilege escalation).
    (config) => ({
      ...config,
      collections: config.collections?.map((c) =>
        c.slug !== 'users'
          ? c
          : {
              ...c,
              fields: c.fields.map(
                (f): Field =>
                  'name' in f && f.name === 'roles'
                    ? ({
                        ...f,
                        access: { ...('access' in f ? f.access : {}), update: ({ req }) => isAdmin(req.user) },
                      } as Field)
                    : f,
              ),
            },
      ),
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
