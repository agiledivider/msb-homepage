'use client'

import { Popup, useAuth, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Tone = 'neutral' | 'review' | 'rejected' | 'live'

const TONE: Record<Tone, string> = {
  neutral: 'var(--theme-elevation-500)',
  review: '#b7791f',
  rejected: '#c0392b',
  live: 'var(--theme-success-500)',
}

const box: React.CSSProperties = {
  padding: 12,
  width: 300,
  maxWidth: 'calc(100vw - 32px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}
const text: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5 }
/** Rejecting is the one destructive step here, so its buttons are red. */
const rejectButton: React.CSSProperties = { margin: 0, border: `1px solid ${TONE.rejected}` }
const hint: React.CSSProperties = { ...text, fontSize: 12, color: 'var(--theme-elevation-500)' }

const dateTime = (iso: unknown) =>
  typeof iso === 'string'
    ? new Date(iso).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

/** What state is the version in this form, and is something else online meanwhile? */
function describe(doc: Record<string, unknown> | undefined, hasPublishedDoc: boolean, hasNewerDraft: boolean) {
  const status = (doc?.reviewStatus as string | undefined) ?? 'draft'
  const live = hasPublishedDoc
    ? 'Die veröffentlichte Version bleibt online, bis die Änderungen freigegeben sind.'
    : 'Noch nicht online.'

  if (status === 'in_review') {
    const at = dateTime(doc?.submittedAt)
    return {
      tone: 'review' as Tone,
      label: 'In Prüfung',
      lines: [at ? `Eingereicht am ${at}. ${live}` : live],
    }
  }
  if (status === 'changes_requested') {
    return {
      tone: 'rejected' as Tone,
      label: 'Abgelehnt',
      lines: ['Überarbeiten und erneut zur Prüfung einreichen.', live],
    }
  }
  if (doc?._status === 'published' && !hasNewerDraft) {
    return { tone: 'live' as Tone, label: 'Veröffentlicht', lines: ['Diese Version ist online.'] }
  }
  return { tone: 'neutral' as Tone, label: 'Entwurf', lines: [live] }
}

type Version = { id: string | number; version?: { _status?: string } }

/**
 * Which two versions to compare: the newest version against the last
 * *published* one before it — a new draft against what is online, or the live
 * version against the publication it replaced. Null when there is nothing to
 * compare (never published, or published only once with no draft since).
 */
function usePublishedComparison(slug: string | undefined, id: string | number | undefined, updatedAt: unknown) {
  const [pair, setPair] = useState<{ from: Version['id']; to: Version['id']; toIsDraft: boolean } | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: updatedAt only triggers a reload after each save
  useEffect(() => {
    if (!slug || id === undefined) return
    let cancelled = false
    const base = `/api/${slug}/versions?where[parent][equals]=${id}&sort=-updatedAt&depth=0`
    const load = (q: string) =>
      fetch(`${base}${q}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { docs: [] }))
        .then((d: { docs?: Version[] }) => d.docs ?? [])
    Promise.all([load('&limit=1'), load('&limit=2&where[version._status][equals]=published')])
      .then(([[latest], published]) => {
        if (cancelled || !latest) return
        const from = published.find((v) => v.id !== latest.id)
        setPair(from ? { from: from.id, to: latest.id, toIsDraft: latest.version?._status !== 'published' } : null)
      })
      .catch(() => !cancelled && setPair(null))
    return () => {
      cancelled = true
    }
  }, [slug, id, updatedAt])
  return pair
}

/**
 * "Redaktion" status chip in the document controls bar (it stays in reach while
 * the live preview is open, unlike the sidebar). Its popup shows the state of the version in the form
 * (Entwurf / In Prüfung / Abgelehnt + reason / Veröffentlicht), what the main
 * button does for this user, a diff link when a newer draft differs from the
 * live version, and — for reviewers — rejecting with a required reason.
 * Submitting and publishing happen only through the main button (it saves the
 * form; the publish gate decides what it means, see hooks/publishGate.ts).
 */
export function ReviewPanel() {
  const { id, collectionSlug, data, hasPublishedDoc, unpublishedVersionCount } = useDocumentInfo()
  const { user } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const compare = usePublishedComparison(collectionSlug, id, (data as { updatedAt?: unknown } | undefined)?.updatedAt)

  if (!id || !collectionSlug) return null // hide on the "create" screen

  const doc = data as Record<string, unknown> | undefined
  const isReviewer = Boolean((user as { canReview?: boolean } | undefined)?.canReview)
  const hasNewerDraft = hasPublishedDoc && unpublishedVersionCount > 0
  const state = describe(doc, hasPublishedDoc, hasNewerDraft)
  const status = doc?.reviewStatus as string | undefined
  const reviewNote = typeof doc?.reviewNote === 'string' ? doc.reviewNote : ''

  const reject = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/editorial/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collection: collectionSlug, id, action: 'request-changes', note: reason }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `HTTP ${res.status}`)
      setRejecting(false)
      setReason('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  const buttonHint = isReviewer
    ? status === 'in_review'
      ? '„Freigeben & veröffentlichen“ speichert und stellt diese Version sofort online.'
      : '„Veröffentlichen“ speichert und stellt diese Version sofort online.'
    : `„${status === 'in_review' ? 'Erneut zur Prüfung einreichen' : 'Zur Prüfung einreichen'}“ speichert und gibt den Entwurf an die Redaktion. Online geht er erst nach der Freigabe.`

  // data-popup-prevent-close: the popup closes on any button click inside it,
  // which would hide the rejection form the moment it opens.
  const details = (
    <div style={box} data-popup-prevent-close>
      <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Redaktion</strong>

      {state.tone === 'rejected' && reviewNote ? (
        <p style={{ ...text, borderLeft: `3px solid ${TONE.rejected}`, paddingLeft: 8 }}>
          <strong>Grund:</strong> {reviewNote}
        </p>
      ) : null}
      {state.lines.map((l) => (
        <p key={l} style={hint}>
          {l}
        </p>
      ))}

      {compare ? (
        <a
          href={`/admin/collections/${collectionSlug}/${id}/versions/${compare.to}?versionFrom=${compare.from}`}
          className="btn btn--style-secondary btn--size-small"
          style={{ margin: 0, textAlign: 'center' }}
        >
          {compare.toIsDraft ? 'Vergleich mit der Online-Version' : 'Vergleich mit der vorherigen Veröffentlichung'}
        </a>
      ) : null}

      <p style={hint}>{buttonHint}</p>

      {isReviewer && status === 'in_review' ? (
        rejecting ? (
          <>
            <label htmlFor="review-reason" style={{ ...text, fontWeight: 600 }}>
              Grund der Ablehnung (sieht die Autorin / der Autor)
            </label>
            <textarea
              id="review-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                fontSize: 13,
                padding: 6,
                borderRadius: 4,
                border: '1px solid var(--theme-elevation-150)',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn--style-primary btn--size-small"
                style={{ ...rejectButton, background: TONE.rejected, color: '#fff' }}
                disabled={busy || !reason.trim()}
                onClick={reject}
              >
                Ablehnen &amp; zurückgeben
              </button>
              <button
                type="button"
                className="btn btn--style-secondary btn--size-small"
                style={{ margin: 0 }}
                disabled={busy}
                onClick={() => setRejecting(false)}
              >
                Abbrechen
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--style-secondary btn--size-small"
            style={{ ...rejectButton, background: 'transparent', color: TONE.rejected }}
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            Ablehnen…
          </button>
        )
      ) : null}

      {error ? <p style={{ ...text, fontSize: 12, color: TONE.rejected }}>{error}</p> : null}
    </div>
  )

  const chip = (
    <span
      title={state.tone === 'rejected' && reviewNote ? `Abgelehnt: ${reviewNote}` : `Redaktion: ${state.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 10px',
        border: `1px solid ${TONE[state.tone]}`,
        borderRadius: 16,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: 'var(--theme-text)',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: TONE[state.tone] }} />
      {state.label}
      <span aria-hidden="true" style={{ fontSize: 10, color: 'var(--theme-elevation-500)' }}>
        ▾
      </span>
    </span>
  )

  return (
    <Popup
      button={chip}
      buttonType="custom"
      horizontalAlign="right"
      verticalAlign="bottom"
      size="fit-content"
      caret={false}
      id="editorial-review"
      portalClassName="editorial-review-popup"
    >
      {details}
    </Popup>
  )
}
