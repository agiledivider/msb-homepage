'use client'

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { serverURL } from '@/lib/preview'

/**
 * Rendered only while Draft Mode is on (inside the live-preview iframe). Listens
 * for Payload's "document saved" postMessage and refreshes the route so the
 * server component re-fetches the latest draft.
 *
 * The message is only accepted from `serverURL`. In the browser that must be
 * this page's own origin (admin and site are one app): NEXT_PUBLIC_SERVER_URL
 * is baked in at build time, and the released image is built without it, so
 * it fell back to localhost:3000 and staging ignored every save.
 */
export function RefreshRouteOnSave() {
  const router = useRouter()
  const origin = typeof window === 'undefined' ? serverURL : window.location.origin
  return <PayloadRefreshRouteOnSave refresh={() => router.refresh()} serverURL={origin} />
}
