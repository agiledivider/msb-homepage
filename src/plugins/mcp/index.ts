import { mcpPlugin } from '@payloadcms/plugin-mcp'
import {
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type Config,
  type Field,
  type Plugin,
  UnauthorizedError,
} from 'payload'
import { type KeyLifetime, keyIsValid, keyLifetimeFields, shouldStampLastUsed } from './keyLifetime'
import { makePreviewLinkTool } from './previewLink'
import { makeUploadMediaTool } from './uploadMedia'

/** What Claude may do per collection. No deletes; new media only via `uploadMedia`. */
const writable = { find: true, create: true, update: true }

const INSTRUCTIONS = `MakerSpace Bonn e.V. website CMS. Write content in German unless asked otherwise.
Everything you create or change is saved as a draft and never goes live by itself:
after you're done, tell the editor to open the draft in the CMS, check it and
submit it for review there. You can't publish, approve or delete anything.
Find existing media first if a post or event should show an image; to add a
new one, use uploadMedia (public https URL or base64 content) and set its ID as
the post's cover or the event's image. Uploaded files are public right away.
For an AI-made image pass aiLabel "generated" ("edited" for an AI-changed photo);
the site draws the KI label itself, so never put a label into the file.
To check how a post or event looks (homepage hero and its own page), call
previewLink and open the link in a browser; it is valid for 15 minutes.
Keep titles short: at most 70 characters for blog posts and 60 for events
(the start-page hero has no room for more); dates, prices and details go
into the subtitle or the text.
Workshops (Werkstätten) are fixed-template pages: fill their fields, don't invent
facts. Which machines need an Einweisung, contact names, opening times and prices
must come from the editor; leave a field empty rather than guess. Link events and
blog posts to a workshop through their "workshops" field.`

/**
 * A new key may use every capability configured above (the plugin defaults
 * each checkbox to off, which hands editors an empty key). They can untick any.
 */
const allowByDefault = (field: Field): Field => {
  if (field.type === 'checkbox') return { ...field, defaultValue: true }
  if ((field.type === 'collapsible' || field.type === 'group') && 'fields' in field) {
    return { ...field, fields: field.fields.map(allowByDefault) } as Field
  }
  return field
}

/**
 * Claude (or any MCP client) works in the CMS with an editor's own rights.
 *
 * Each editor creates a personal key under Verwaltung → KI-Zugänge; a key acts
 * as that user, so Payload access control and RBAC apply unchanged. Writes are
 * forced to drafts by the editorial plugin (`mcpDraftOnly`). Endpoint:
 * `<NEXT_PUBLIC_SERVER_URL>/api/mcp`, header `Authorization: Bearer <key>`.
 */
const basePlugin = mcpPlugin({
  userCollection: 'users',
  collections: {
    blog: { enabled: writable, description: 'Blog posts of the MakerSpace (Blog).' },
    events: { enabled: writable, description: 'Events: workshops, open evenings, meetups (Termine).' },
    pages: { enabled: writable, description: 'Content pages built from blocks, e.g. Verein, Mitmachen.' },
    workshops: {
      enabled: writable,
      description:
        'Workshops (Werkstätten), one page each at /werkzeug/<slug>: promise, quick facts, activities, machines with access, safety, material, contact.',
    },
    media: {
      enabled: { find: true },
      description: 'Images and PDFs; reference them by ID. New files: the uploadMedia tool.',
    },
  },
  mcp: {
    tools: [makeUploadMediaTool(), makePreviewLinkTool()],
    serverOptions: {
      serverInfo: { name: 'MakerSpace Bonn CMS', version: '1.0.0' },
      instructions: INSTRUCTIONS,
    },
  },
  // The plugin loads the key's user without roles → every RBAC check would
  // fail. Reload it with roles and their permissions, as a session login has.
  overrideAuth: async (req, getDefaultMcpAccessSettings) => {
    const settings = await getDefaultMcpAccessSettings()
    // S2.6: expired keys are refused (counts as a failed attempt), use is stamped.
    const key = settings as unknown as KeyLifetime & { id: number | string }
    const now = new Date()
    if (!keyIsValid(key, now)) throw new UnauthorizedError()
    if (shouldStampLastUsed(key, now)) {
      await req.payload.update({
        collection: 'payload-mcp-api-keys' as never,
        id: key.id,
        data: { lastUsedAt: now.toISOString() } as never,
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
    const user = await req.payload.findByID({
      collection: 'users',
      id: settings.user.id,
      depth: 2,
      overrideAccess: true,
      req,
    })
    return { ...settings, user: { ...user, collection: 'users', _strategy: 'mcp-api-key' } as never }
  },
  overrideApiKeyCollection: (collection: CollectionConfig): CollectionConfig => ({
    ...collection,
    fields: [...collection.fields.map(allowByDefault), ...keyLifetimeFields],
    labels: { singular: 'KI-Zugang', plural: 'KI-Zugänge' },
    admin: {
      ...collection.admin,
      group: 'Verwaltung',
      defaultColumns: ['label', 'user', 'lastUsedAt', 'expiresAt'],
      description:
        'Persönliche Schlüssel, mit denen Claude in deinem Namen Entwürfe anlegt. Claude kann nichts veröffentlichen.',
    },
  }),
})

/**
 * A key's `user` is NOT NULL but the plugin declares `ON DELETE set null`, so
 * deleting a CMS account that has keys fails in SQLite. Delete the keys first,
 * in the same request (and transaction): someone who leaves loses Claude too.
 */
const deleteKeysOfUser: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'payload-mcp-api-keys' as never,
    where: { user: { equals: id } },
    overrideAccess: true,
    req,
  })
}

export const claudeMcp: Plugin = async (incoming: Config): Promise<Config> => {
  const config = await basePlugin(incoming)
  return {
    ...config,
    collections: config.collections?.map((c) =>
      c.slug === 'users'
        ? { ...c, hooks: { ...c.hooks, beforeDelete: [...(c.hooks?.beforeDelete ?? []), deleteKeysOfUser] } }
        : c,
    ),
  }
}
