import type { Config, Field, Plugin } from 'payload'
import { isReviewer } from './access'
import { makeTransitionEndpoint } from './endpoints/transition'
import { canReviewField, reviewFields } from './fields'
import { makePublishGate } from './hooks/publishGate'
import type { EditorialOptions } from './types'

const hasField = (fields: Field[], name: string): boolean => fields.some((f) => 'name' in f && f.name === name)

const uniq = (arr: string[]): string[] => Array.from(new Set(arr))

/**
 * Editorial workflow: role-based publishing (editor drafts → reviewer approves),
 * per-field edit locks, and a review panel that leans on Payload's built-in
 * version diff. Applies to `options.collections`; injects `roles` into the auth
 * collection. Requires the target collections to support drafts (auto-enabled).
 */
export const editorialWorkflow =
  (options: EditorialOptions): Plugin =>
  (config: Config): Config => {
    if (options.disabled) return config

    const targets = new Set(options.collections)
    const authSlug = config.admin?.user ?? 'users'

    const collections = (config.collections ?? []).map((col) => {
      // 1. inject the `canReview` flag into the auth collection (for the review UI)
      if (col.slug === authSlug) {
        return hasField(col.fields, 'canReview') ? col : { ...col, fields: [...col.fields, canReviewField()] }
      }

      if (!targets.has(col.slug)) return col

      // 2. ensure drafts (needed for the version diff)
      const current = typeof col.versions === 'object' ? col.versions : {}
      const versions = { ...current, drafts: current.drafts ?? true }

      // 3. lock configured fields to reviewers only
      const locked = new Set(options.lockedFields?.[col.slug] ?? [])
      const fields = col.fields.map((f): Field => {
        if ('name' in f && typeof f.name === 'string' && locked.has(f.name)) {
          const prev = 'access' in f ? f.access : undefined
          return {
            ...f,
            access: { ...prev, update: ({ req }) => isReviewer(req.user) },
          } as Field
        }
        return f
      })

      // 4. append review meta + panel, add the gate hook, surface the status column
      return {
        ...col,
        versions,
        fields: [...fields, ...reviewFields()],
        admin: {
          ...col.admin,
          defaultColumns: uniq([...(col.admin?.defaultColumns ?? []), 'reviewStatus']),
        },
        hooks: {
          ...col.hooks,
          beforeChange: [...(col.hooks?.beforeChange ?? []), makePublishGate()],
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
            '/plugins/editorial/components/ReviewDashboard#ReviewDashboard',
          ],
        },
      },
      collections,
      endpoints: [...(config.endpoints ?? []), makeTransitionEndpoint(targets)],
    }
  }
