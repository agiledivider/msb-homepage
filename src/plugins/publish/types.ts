export interface PublishOptions {
  /**
   * Collections whose publish/unpublish should queue a site rebuild.
   * A change only counts when the doc is (or was) `_status: published` —
   * saving a draft doesn't spend a build.
   */
  collections: string[]
  /** Queue a rebuild automatically when published content changes. Default: true. */
  autoPublish?: boolean
  /** Turn the plugin off without removing it from the config. */
  disabled?: boolean
}

/** Publisher service base URL, e.g. http://publisher:8080 (unset → feature disabled). */
export const publisherUrl = () => process.env.PUBLISHER_URL || ''
/** Shared secret; the publisher rejects requests without it. */
export const publisherToken = () => process.env.PUBLISH_TOKEN || ''
