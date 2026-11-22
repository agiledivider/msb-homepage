import type { CollectionBeforeOperationHook } from 'payload'

/** Review metadata only the review workflow writes; never taken from an MCP client. */
const REVIEW_FIELDS = ['reviewStatus', 'reviewNote', 'reviewedBy', 'submittedAt'] as const

/**
 * Claude (via MCP) only ever writes drafts, whoever's key it uses.
 *
 * Forcing Payload's own `draft` flag (not just `_status`) matters: an update
 * then saves a new draft version next to the live one, so editing a published
 * page through Claude never takes it offline. Review fields are dropped, so a
 * client can't mark its own draft approved. Publishing stays with people in the
 * CMS, through the normal review.
 */
export const makeMcpDraftOnly =
  (): CollectionBeforeOperationHook =>
  ({ args, operation, req }) => {
    // the MCP plugin sets this on every request it serves; Payload's type doesn't list it
    if ((req.payloadAPI as string) !== 'MCP') return args
    if (operation !== 'create' && operation !== 'update') return args

    args.draft = true
    const data = args.data as Record<string, unknown> | undefined
    if (data) {
      data._status = 'draft'
      for (const field of REVIEW_FIELDS) delete data[field]
    }
    return args
  }
