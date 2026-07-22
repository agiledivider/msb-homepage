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
type Progress = {
  stage: string
  label: string
  step: number
  steps: number
  current?: number
  total?: number
  /** Sub-step within the stage, e.g. which phase of the Next build. */
  detail?: string
  /** Weighted completion 0–1, computed by the publisher. */
  fraction?: number
}
type Status = {
  phase?: 'idle' | 'queued' | 'running'
  startedAt?: string
  reason?: string
  /** What the running publish is doing right now. */
  progress?: Progress
  /** A debounced auto-publish waiting to fire. */
  pending?: { reason: string; dueAt: string }
  last?: Result
  unavailable?: boolean
  error?: string
}

const fmtWhen = (iso?: string) => (iso ? new Date(iso).toLocaleString('de-DE') : '—')
const fmtDur = (ms?: number) => (ms == null ? '' : `${Math.round(ms / 1000)}s`)
const fmtElapsed = (from?: string) => (from ? `${Math.max(0, Math.round((Date.now() - +new Date(from)) / 1000))}s` : '')

/**
 * Overall completion, 0–1. The publisher weights stages by real duration; the
 * step-based value is only a fallback for an older publisher.
 */
function fraction(p: Progress): number {
  if (typeof p.fraction === 'number') return p.fraction
  const within = p.total ? Math.min(1, (p.current ?? 0) / p.total) : 0
  return Math.min(1, (p.step - 1 + within) / p.steps)
}

/** Rough remaining time, from how long the last successful publish took. */
function eta(startedAt?: string, lastMs?: number): string {
  if (!startedAt || !lastMs) return ''
  const left = Math.round((lastMs - (Date.now() - +new Date(startedAt))) / 1000)
  return left > 5 ? ` · noch ca. ${left}s` : ''
}

/** Indeterminate spinner — CSS only, no dependency. */
function Spinner() {
  return (
    <>
      <style>{'@keyframes msb-spin{to{transform:rotate(360deg)}}'}</style>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 13,
          height: 13,
          marginRight: 8,
          verticalAlign: '-2px',
          border: '2px solid var(--theme-elevation-300)',
          borderTopColor: 'var(--theme-success-500, #4caf50)',
          borderRadius: '50%',
          animation: 'msb-spin .8s linear infinite',
        }}
      />
    </>
  )
}

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
  // 2s rather than 5s: the stages are short enough that a slower poll makes the
  // bar look stuck. Also poll while a debounced run is pending, so the panel
  // notices when it starts.
  useEffect(() => {
    const active = status?.phase === 'running' || status?.phase === 'queued' || Boolean(status?.pending)
    if (!active) return
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [status?.phase, status?.pending, load])

  // Re-render once a second so the elapsed counter advances between polls.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (status?.phase !== 'running') return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [status?.phase])

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
              <>
                <Spinner />
                <strong>
                  {status?.progress
                    ? `${status.progress.label}${status.progress.detail ? ` — ${status.progress.detail}` : ''} (Schritt ${status.progress.step}/${status.progress.steps})`
                    : 'Veröffentlichung wird vorbereitet…'}
                </strong>
                {status?.progress?.total && !status.progress.detail ? (
                  <span style={{ color: 'var(--theme-elevation-600)' }}>
                    {' '}
                    — {status.progress.current ?? 0}/{status.progress.total}
                  </span>
                ) : null}
                <span style={{ color: 'var(--theme-elevation-600)' }}>
                  {' '}
                  · {fmtElapsed(status?.startedAt)}
                  {eta(status?.startedAt, status?.last?.ok ? status.last.durationMs : undefined)}
                </span>
                <br />
                <span style={{ color: 'var(--theme-elevation-600)', fontSize: 12 }}>{status?.reason}</span>
              </>
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
          {running ? (
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'var(--theme-elevation-150)',
                overflow: 'hidden',
                margin: '0 0 .85rem',
              }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={status?.progress ? Math.round(fraction(status.progress) * 100) : undefined}
            >
              <div
                style={{
                  height: '100%',
                  width: `${status?.progress ? Math.max(2, fraction(status.progress) * 100) : 2}%`,
                  background: 'var(--theme-success-500, #4caf50)',
                  transition: 'width .4s ease',
                }}
              />
            </div>
          ) : null}
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
