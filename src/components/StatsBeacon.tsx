'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export const STATS_ENDPOINT = '/api/stats/hit'

/** Pages that render this attribute (the 404 page) are not counted. */
export const STATS_SKIP_ATTR = 'data-stats-skip'

/** Visitors who ask not to be followed (Global Privacy Control, Do Not Track) aren't counted at all. */
export function optedOut(nav: Navigator): boolean {
  const n = nav as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null }
  return n.globalPrivacyControl === true || n.doNotTrack === '1'
}

/**
 * Counts one page view (S5.11, D-012). Sends the path and, on the first page
 * of a visit, the referrer, nothing else: no cookie, no storage, no ID. Later
 * pages in the same tab (client-side navigation) say so with `n`, so they add
 * to the page views but not to the visits. `sendBeacon` posts after the page
 * has painted and never delays it; a text/plain body keeps it a simple
 * same-origin request.
 */
export function StatsBeacon() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    if (!pathname) return
    const soft = !first.current
    first.current = false
    if (optedOut(navigator) || document.querySelector(`[${STATS_SKIP_ATTR}]`)) return
    const body = JSON.stringify(soft ? { p: pathname, n: true } : { p: pathname, r: document.referrer || undefined })
    try {
      navigator.sendBeacon?.(STATS_ENDPOINT, new Blob([body], { type: 'text/plain' }))
    } catch {
      // counting must never disturb the page
    }
  }, [pathname])

  return null
}
