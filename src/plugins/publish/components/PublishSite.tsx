'use client'

import { useCallback, useEffect, useState } from 'react'

type Result = {
  at: string
  ok: boolean
  reason: string
  routes?: number
  image?: string
  error?: string
  durationMs: number
}
type Status = {
  phase?: 'idle' | 'queued' | 'running'
  startedAt?: string
  reason?: string
  /** A debounced auto-publish waiting to fire. */
  pending?: { reason: string; dueAt: string }
  last?: Result
  unavailable?: boolean
  error?: string
}

const fmtWhen = (iso?: string) => (iso ? new Date(iso).toLocaleString('de-DE') : '—')
const fmtDur = (ms?: number) => (ms == null ? '' : `${Math.round(ms / 1000)}s`)

/**
 * Dashboard widget: publish the public website.
 *
 * The site is served as a static snapshot, so content only goes live once a
 * build has run. This shows whether one is running, when the last one finished,
 * and lets a publisher start one. The button is only rendered for users the
 * `/api/publish/status` endpoint accepts, so editors never see a control they
 * can't use.
 */
export function PublishSite() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/publish/status', { credentials: 'include' })
      if (res.status === 401 || res.status === 403) {
        setForbidden(true)
        return
      }
      setStatus(await res.json())
    } catch {
      setStatus({ unavailable: true })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Poll while a build is in flight so the panel tracks it without a refresh.
  useEffect(() => {
    if (status?.phase !== 'running' && status?.phase !== 'queued') return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [status?.phase, load])

  const publish = async () => {
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/publish/trigger', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      setNote(res.ok ? (data.note ?? 'Veröffentlichung gestartet.') : (data.error ?? 'Fehlgeschlagen.'))
      await load()
    } catch (err) {
      setNote(String(err))
    } finally {
      setBusy(false)
    }
  }

  if (forbidden) return null

  const running = status?.phase === 'running' || status?.phase === 'queued'
  const last = status?.last

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ margin: '0 0 .25rem' }}>Website veröffentlichen</h3>
      <p style={{ margin: '0 0 .75rem', color: 'var(--theme-elevation-600)', fontSize: 13 }}>
        Die Website ist ein statischer Schnappschuss — Änderungen sind erst nach einer Veröffentlichung online.
      </p>

      {status?.unavailable ? (
        <p style={{ color: 'var(--theme-error-500)', fontSize: 13 }}>
          Publisher-Dienst nicht erreichbar{status.error ? ` (${status.error})` : ''}.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, margin: '0 0 .75rem' }}>
            {running ? (
              <strong>Veröffentlichung läuft… ({status?.reason})</strong>
            ) : last ? (
              <>
                Zuletzt: {fmtWhen(last.at)} — {last.ok ? `${last.routes} Seiten` : 'fehlgeschlagen'}{' '}
                {fmtDur(last.durationMs)}
                {last.ok ? '' : ` — ${last.error}`}
              </>
            ) : (
              'Noch keine Veröffentlichung.'
            )}
          </p>
          {status?.pending ? (
            <p style={{ fontSize: 13, margin: '0 0 .75rem', color: 'var(--theme-elevation-600)' }}>
              Automatische Veröffentlichung geplant für {fmtWhen(status.pending.dueAt)} ({status.pending.reason}) — oder
              jetzt starten.
            </p>
          ) : null}
          <button type="button" className="btn btn--style-primary" onClick={publish} disabled={busy || running}>
            {running ? 'Läuft…' : 'Jetzt veröffentlichen'}
          </button>
        </>
      )}

      {note ? <p style={{ fontSize: 12, marginTop: '.5rem', color: 'var(--theme-elevation-600)' }}>{note}</p> : null}
    </div>
  )
}
