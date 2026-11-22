import type { PayloadRequest } from 'payload'
import { z } from 'zod'
import { serverURL } from '@/lib/preview'
import { PREVIEW_COLLECTIONS, PREVIEW_TTL_MS, signPreviewToken } from '@/lib/previewToken'

const parameters = {
  collection: z.enum(PREVIEW_COLLECTIONS).describe('"blog" for a blog post, "events" for an event.'),
  id: z.coerce.number().int().positive().describe('The ID of the blog post or event.'),
}
const Args = z.object(parameters)

/**
 * `previewLink`: a signed link (valid 15 minutes) that shows one draft as it
 * would go live, in the homepage hero (desktop + mobile) and on its own page,
 * without a CMS login. Only for documents the key owner may read.
 */
export const makePreviewLinkTool = (clock: () => Date = () => new Date()) => ({
  name: 'previewLink',
  description:
    'Get a link (valid 15 minutes, no login needed) that shows a blog post or event, including its latest draft, ' +
    'the way it would look live: in the homepage hero carousel (desktop and mobile) and on its own page. ' +
    'Open it in a browser to check your work.',
  parameters,
  handler: async (raw: Record<string, unknown>, req: PayloadRequest) => {
    const { collection, id } = Args.parse(raw)
    // Throws for documents that don't exist or that the key owner can't read.
    await req.payload.findByID({ collection, id, draft: true, depth: 0, overrideAccess: false, user: req.user, req })

    const now = clock()
    const token = signPreviewToken({ collection, id }, req.payload.secret, now)
    const url = `${serverURL.replace(/\/+$/, '')}/preview/link?t=${token}`
    const until = new Date(now.getTime() + PREVIEW_TTL_MS).toISOString()
    return {
      content: [{ type: 'text' as const, text: `Preview of ${collection} ${id} (valid until ${until}): ${url}` }],
    }
  },
})
