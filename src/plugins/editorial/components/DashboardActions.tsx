'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Per-item reviewer actions on the dashboard: jump to the diff, or approve &
 *  publish right from the overview (no need to open the document). */
export function DashboardActions({ collectionSlug, id }: { collectionSlug: string; id: string | number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const openDiff = async () => {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/${collectionSlug}/versions?where[parent][equals]=${id}&limit=1&sort=-updatedAt&depth=0`,
        { credentials: 'include' },
      )
      const data = await res.json()
      const versionId = data?.docs?.[0]?.id
      window.location.href = versionId
        ? `/admin/collections/${collectionSlug}/${id}/versions/${versionId}`
        : `/admin/collections/${collectionSlug}/${id}/versions`
    } catch {
      setBusy(false)
    }
  }

  const publish = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/editorial/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collection: collectionSlug, id, action: 'approve' }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh() // approved item drops out of the queue
    } finally {
      setBusy(false)
    }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
      <button
        type="button"
        onClick={openDiff}
        disabled={busy}
        className="btn btn--style-secondary btn--size-small"
        style={{ margin: 0 }}
      >
        Diff
      </button>
      <button
        type="button"
        onClick={publish}
        disabled={busy}
        className="btn btn--style-primary btn--size-small"
        style={{ margin: 0 }}
      >
        Freigeben
      </button>
    </span>
  )
}
