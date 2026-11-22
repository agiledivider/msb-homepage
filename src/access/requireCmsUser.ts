import type { Config, Plugin } from 'payload'
import { loggedIn } from './admin'

const COLLECTION_OPS = ['create', 'read', 'update', 'delete', 'readVersions', 'unlock'] as const
const GLOBAL_OPS = ['read', 'update', 'readVersions'] as const

/**
 * Payload's default for an access rule nobody set is "any authenticated
 * principal", and that includes an MCP API key calling REST as itself. This
 * fills every unset rule of every collection and global with `loggedIn` (a real
 * CMS user) instead. Rules a collection sets itself stay as they are. Runs after
 * the plugins that add collections, so theirs are covered too.
 */
export const requireCmsUserByDefault: Plugin = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map((c) => ({
    ...c,
    access: {
      ...Object.fromEntries(COLLECTION_OPS.map((op) => [op, loggedIn])),
      ...c.access,
    },
  })),
  globals: config.globals?.map((g) => ({
    ...g,
    access: {
      ...Object.fromEntries(GLOBAL_OPS.map((op) => [op, loggedIn])),
      ...g.access,
    },
  })),
})
