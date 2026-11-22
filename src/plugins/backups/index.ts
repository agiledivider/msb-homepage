import type { Config, Plugin } from 'payload'
import { backupEndpoints } from './endpoints'

/**
 * Backups in the admin (E8): a view at /admin/backups and a sidebar link, both
 * for admins only, plus the endpoints its "Jetzt sichern" button uses. The data comes from the backup container's internal API
 * (scripts/backup/backup-api.mjs); see ./load.ts.
 */
export const backupsAdmin =
  (): Plugin =>
  (config: Config): Config => ({
    ...config,
    admin: {
      ...config.admin,
      components: {
        ...config.admin?.components,
        afterNavLinks: [
          ...(config.admin?.components?.afterNavLinks ?? []),
          '/plugins/backups/components/BackupsNavLink#BackupsNavLink',
        ],
        views: {
          ...config.admin?.components?.views,
          backups: { Component: '/plugins/backups/components/BackupsView#BackupsView', path: '/backups' },
        },
      },
    },
    endpoints: [...(config.endpoints ?? []), ...backupEndpoints],
  })
