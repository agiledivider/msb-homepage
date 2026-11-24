import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { Field } from 'payload'
import { buildConfig } from 'payload'
import { rbac } from 'payload-rbac-plugin'
import sharp from 'sharp'
import { adminOnly, hideForNonAdmins, loggedIn } from './access/admin'
import { requireCmsUserByDefault } from './access/requireCmsUser'
import { Blog } from './collections/Blog'
import { Events } from './collections/Events'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'
import { Workshops } from './collections/Workshops'
import { devLoginEndpoint } from './endpoints/devLogin'
import { HeroSettings } from './globals/HeroSettings'
import { SiteSettings } from './globals/SiteSettings'
import { devLoginEnabled } from './lib/devLogin'
import { passwordLoginEnabled } from './lib/passwordLogin'
import { payloadSecret } from './lib/payloadSecret'
import { autofilePlugin } from './plugins/autofile/plugin'
import { backupsAdmin } from './plugins/backups'
import { editorialWorkflow } from './plugins/editorial'
import { isAdmin } from './plugins/editorial/access'
import { claudeMcp } from './plugins/mcp'
import { kanidmEnabled, kanidmOAuth } from './plugins/oidc'
import { sitePublishing } from './plugins/publish'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '· MakerSpace Bonn' },
    // "Sign in with Kanidm" button under the password form (renders nothing
    // when Kanidm SSO isn't configured — see src/plugins/oidc).
    components: {
      afterLogin: ['/components/auth/KanidmLoginButton#KanidmLoginButton', '/components/auth/DevLogin#DevLogin'],
      // MSB branding + "Start" link at the top of the sidebar; look in custom.scss.
      beforeNavLinks: ['/components/admin/NavBrand#NavBrand'],
      // Payload's sidebar plus an icon rail while it's closed (S9.1).
      Nav: '/components/admin/Nav#Nav',
      graphics: {
        Icon: '/components/admin/Graphics#AdminIcon',
        Logo: '/components/admin/Graphics#AdminLogo',
      },
    },
  },
  editor: lexicalEditor(),
  // Dev only: one-click logins as the test accounts (src/lib/devLogin.ts). Not registered elsewhere.
  endpoints: devLoginEnabled(process.env) ? [devLoginEndpoint] : [],
  // Order drives the sidebar: editors' "Inhalte" group first, "Verwaltung" last.
  collections: [Blog, Events, Pages, Workshops, Media, Users],
  globals: [HeroSettings, SiteSettings],
  // Folders for media, pages, posts and events (`folders: true` on each).
  // Logged-in users only, like media uploads: anonymous visitors see no
  // folders, and the public site never depends on them.
  folders: {
    collectionOverrides: [
      ({ collection }) => ({
        ...collection,
        labels: { singular: 'Ordner', plural: 'Ordner' },
        admin: { ...collection.admin, group: 'Inhalte' },
        access: { read: loggedIn, create: loggedIn, update: loggedIn, delete: loggedIn },
      }),
    ],
  },
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI || 'file:./msb.db' },
    // Every real database (dev and server) is built by migrations, so each one
    // carries its own migration history and backups move freely between them
    // (D-010). Only the throwaway test DBs use push; tests/integration/
    // migrations-match-schema.test.ts checks the migrations build the same schema.
    push: process.env.NODE_ENV === 'test',
  }),
  plugins: [
    editorialWorkflow({
      collections: ['blog', 'events', 'pages', 'workshops'],
      // fields only reviewers may edit (editors see them locked)
      lockedFields: { blog: ['publishedAt'] },
    }),
    // Publish the static site from the admin (button + auto-publish on change).
    // The build runs in the separate publisher container; see docs/PUBLISHING.md.
    sitePublishing({ collections: ['blog', 'events', 'pages', 'workshops'] }),
    // New and edited events / blog posts without a folder are filed into
    // Events|Blog / year / month, with images only they use (src/plugins/autofile).
    autofilePlugin(),
    // Backups view for admins (/admin/backups); data from the backup container. See docs/BACKLOG.md E8.
    backupsAdmin(),
    // UI-configurable roles & permissions (Roles + Permissions collections).
    // Locked to admins so the permission system can't be edited by others. Any
    // logged-in user may read role names, or their own account shows "Untitled".
    rbac({
      enabled: true,
      rolesAccess: { read: loggedIn, create: adminOnly, update: adminOnly, delete: adminOnly },
      permissionsAccess: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
      hideRoles: hideForNonAdmins,
      hidePermissions: hideForNonAdmins,
    }),
    // The RBAC `roles` field ships without field access — lock its editing to
    // admins so a self-service update can't grant roles (privilege escalation).
    // Also drop it from the JWT: `saveToJWT: true` (the plugin default) serialises
    // the *populated* roles + permissions, which blows the OAuth login token past
    // the ~4KB cookie limit (silently dropped → auth lost). `req.user` is still
    // populated from the DB for access control, so permissions are unaffected.
    (config) => ({
      ...config,
      collections: config.collections?.map((c) =>
        c.slug === 'roles' || c.slug === 'permissions'
          ? {
              ...c,
              labels:
                c.slug === 'roles'
                  ? { singular: 'Rolle', plural: 'Rollen' }
                  : { singular: 'Berechtigung', plural: 'Berechtigungen' },
              admin: { ...c.admin, group: 'Verwaltung' },
            }
          : c.slug !== 'users'
            ? c
            : {
                ...c,
                fields: c.fields.map(
                  (f): Field =>
                    'name' in f && f.name === 'roles'
                      ? ({
                          ...f,
                          saveToJWT: false,
                          access: { ...('access' in f ? f.access : {}), update: ({ req }) => isAdmin(req.user) },
                        } as Field)
                      : f,
                ),
              },
      ),
    }),
    // Claude via MCP, with each editor's own rights; writes are drafts only.
    claudeMcp,
    // Unset access rules mean "a real CMS user", not "any authenticated
    // principal" (an MCP key on REST). After every plugin that adds collections.
    requireCmsUserByDefault,
    // Kanidm (OIDC) sign-in alongside email/password. Last so it modifies the
    // fully-assembled `users` collection (RBAC `roles` + `canReview` already added).
    // No-op unless KANIDM_* env vars are set. See src/plugins/oidc.
    kanidmOAuth,
  ],
  // Fails fast instead of running with an empty secret; see src/lib/payloadSecret.ts.
  secret: payloadSecret(process.env),
  onInit: async (payload) => {
    // Kanidm only (PASSWORD_LOGIN=off) but Kanidm not configured: nobody can log
    // into the CMS. Only a warning, because the publisher shares this config and
    // never logs in. Fix: set KANIDM_* or, as emergency access, PASSWORD_LOGIN=on.
    if (!passwordLoginEnabled(process.env) && !kanidmEnabled) {
      payload.logger.warn(
        'Neither password login (PASSWORD_LOGIN=off) nor Kanidm (KANIDM_* unset) is available: nobody can log into the CMS.',
      )
    }
  },
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
