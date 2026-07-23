import type { Config, Plugin } from 'payload'
import { makePublishEndpoints } from './endpoints/publish'
import { makeAutoPublishHook } from './hooks/autoPublish'
import type { PublishOptions } from './types'

/**
 * Site publishing: lets publishers trigger the static build + push from the
 * admin, and queues one automatically when published content changes.
 *
 * The build itself runs in a separate publisher container (see
 * `scripts/publisher-server.ts`) so it never competes with this process or
 * rewrites the `.next` it is serving from. This plugin only decides *who* may
 * ask for a publish and *when* one is worth asking for.
 */
export const sitePublishing =
  (options: PublishOptions): Plugin =>
  (config: Config): Config => {
    if (options.disabled) return config

    const autoPublish = options.autoPublish ?? true
    const targets = new Set(options.collections)

    const collections = (config.collections ?? []).map((col) => {
      if (!autoPublish || !targets.has(col.slug)) return col
      return {
        ...col,
        hooks: {
          ...col.hooks,
          afterChange: [...(col.hooks?.afterChange ?? []), makeAutoPublishHook()],
        },
      }
    })

    return {
      ...config,
      admin: {
        ...config.admin,
        components: {
          ...config.admin?.components,
          beforeDashboard: [
            ...(config.admin?.components?.beforeDashboard ?? []),
            '/plugins/publish/components/PublishSite#PublishSite',
          ],
        },
      },
      collections,
      endpoints: [...(config.endpoints ?? []), ...makePublishEndpoints()],
    }
  }
