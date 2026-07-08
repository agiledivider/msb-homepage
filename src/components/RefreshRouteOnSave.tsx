'use client'

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { serverURL } from '@/lib/preview'

/**
 * Rendered only while Draft Mode is on (inside the live-preview iframe). Listens
 * for Payload's "document saved" postMessage and refreshes the route so the
 * server component re-fetches the latest draft.
 */
export function RefreshRouteOnSave() {
  const router = useRouter()
  return <PayloadRefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />
}
