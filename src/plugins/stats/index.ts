import type { Config, Plugin } from 'payload'
import { StatPages, StatSources } from './collections'
import { statsHitEndpoint } from './endpoint'

/**
 * Site statistics without tracking (S5.11, D-012): the per-day totals, the
 * public beacon endpoint, and the Statistik view + sidebar link for CMS users.
 * The beacon itself is src/components/StatsBeacon.tsx in the site's layout.
 */
export const siteStats =
  (): Plugin =>
  (config: Config): Config => ({
    ...config,
    collections: [...(config.collections ?? []), StatPages, StatSources],
    admin: {
      ...config.admin,
      components: {
        ...config.admin?.components,
        afterNavLinks: [
          '/plugins/stats/components/StatsNavLink#StatsNavLink',
          ...(config.admin?.components?.afterNavLinks ?? []),
        ],
        views: {
          ...config.admin?.components?.views,
          statistik: { Component: '/plugins/stats/components/StatsView#StatsView', path: '/statistik' },
        },
      },
    },
    endpoints: [...(config.endpoints ?? []), statsHitEndpoint],
  })
