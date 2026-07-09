import config from '@payload-config'
import { draftMode, headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

/**
 * Enables Next.js Draft Mode, then redirects to `path` so the page renders the
 * draft version. Only authenticated Payload users may enable it (the admin/live-
 * preview iframe carries the auth cookie), which keeps drafts off public reach.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')

  // guard against open redirects — only same-site absolute paths
  if (!path?.startsWith('/')) {
    return new Response('Missing or invalid "path"', { status: 400 })
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return new Response('You must be logged in to preview drafts.', { status: 403 })
  }

  const draft = await draftMode()
  draft.enable()

  redirect(path)
}
