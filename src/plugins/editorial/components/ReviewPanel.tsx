'use client'

import { useState } from 'react'
import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

const REVIEWER_ROLES = ['reviewer', 'admin']

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: 'var(--theme-elevation-400)' },
  in_review: { label: 'In Review', color: '#e6a817' },
  changes_requested: { label: 'Änderungen erbeten', color: '#c0392b' },
  approved: { label: 'Freigegeben', color: 'var(--theme-success-500)' },
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 6,
  padding: 12,
  marginTop: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const hintStyle: React.CSSProperties = { margin: 0, fontSize: 12, color: 'var(--theme-elevation-500)', lineHeight: 1.45 }

/**
 * Sidebar review panel. Submitting for review and approving both go through the
 * native "Publish changes" button (the publish gate routes editor → in_review
 * and reviewer → published/approved). This panel adds: a status badge, a "diff"
 * jump to the published-vs-draft comparison, and the reviewer's request-changes
 * action (which has no native equivalent).
 */
export function ReviewPanel() {
  const { id, collectionSlug, savedDocumentData } = useDocumentInfo()
  const { user } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!id || !collectionSlug) return null // hide on the "create" screen

  const status = (savedDocumentData?.reviewStatus as string) ?? 'draft'
  const reviewNote = savedDocumentData?.reviewNote as string | undefined
  const roles = (user?.editorialRoles as string[] | undefined) ?? []
  const isReviewer = roles.some((r) => REVIEWER_ROLES.includes(r))
  const meta = STATUS[status] ?? STATUS.draft

  const openDiff = async () => {
    setBusy(true)
    setError(null)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
      setBusy(false)
    }
  }

  const transition = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/editorial/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collection: collectionSlug, id, action, ...extra }),
      })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Redaktion</strong>
        <span
          style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: meta.color, borderRadius: 4, padding: '2px 8px' }}
        >
          {meta.label}
        </span>
      </div>

      {status === 'changes_requested' && reviewNote ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          <em>Reviewer:</em> {reviewNote}
        </p>
      ) : null}

      <button type="button" className="btn btn--style-secondary btn--size-small" disabled={busy} onClick={openDiff}>
        Diff ansehen (veröffentlicht ↔ Entwurf)
      </button>

      {/* Editor: submit for review (also possible via the native "Publish changes" button) */}
      {!isReviewer ? (
        status === 'in_review' ? (
          <p style={hintStyle}>Eingereicht — wartet auf Freigabe durch einen Reviewer.</p>
        ) : (
          <button type="button" className="btn btn--style-primary btn--size-small" disabled={busy} onClick={() => transition('submit')}>
            Zur Freigabe einreichen
          </button>
        )
      ) : null}

      {/* Reviewer: explicit publish (approve) + request-changes */}
      {isReviewer ? (
        <>
          <button type="button" className="btn btn--style-primary btn--size-small" disabled={busy} onClick={() => transition('approve')}>
            Freigeben &amp; veröffentlichen
          </button>
          {status === 'in_review' ? (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notiz an den Editor (optional)"
                rows={2}
                style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 4, border: '1px solid var(--theme-elevation-150)' }}
              />
              <button type="button" className="btn btn--style-secondary btn--size-small" disabled={busy} onClick={() => transition('request-changes', { note })}>
                Änderungen erbeten
              </button>
            </>
          ) : null}
        </>
      ) : null}

      {error ? <p style={{ margin: 0, fontSize: 12, color: '#c0392b' }}>{error}</p> : null}
    </div>
  )
}
