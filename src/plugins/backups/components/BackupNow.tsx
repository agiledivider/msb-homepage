'use client'

import { Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type Running = { startedAt: string; by: string | null }
type State =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'running'; running: Running | null }
  | { kind: 'error'; message: string }

const BERLIN = new Intl.DateTimeFormat('de-DE', { timeStyle: 'short', timeZone: 'Europe/Berlin' })
const POLL_MS = 3000

/** "Jetzt sichern" on /admin/backups (S8.5): starts a backup, shows it running, refreshes the list when done. */
export function BackupNow({ apiRoute, initialRunning }: { apiRoute: string; initialRunning: Running | null }) {
  const router = useRouter()
  const [state, setState] = useState<State>(
    initialRunning ? { kind: 'running', running: initialRunning } : { kind: 'idle' },
  )

  const start = useCallback(async () => {
    setState({ kind: 'starting' })
    try {
      const res = await fetch(`${apiRoute}/backups/run`, { method: 'POST', credentials: 'include' })
      const body = (await res.json().catch(() => ({}))) as { running?: Running | null }
      if (res.status === 202) setState({ kind: 'running', running: null })
      else if (res.status === 409) setState({ kind: 'running', running: body.running ?? null })
      else
        setState({
          kind: 'error',
          message: 'Das Backup konnte nicht gestartet werden; der Backup-Dienst antwortet nicht.',
        })
    } catch {
      setState({ kind: 'error', message: 'Das Backup konnte nicht gestartet werden (keine Verbindung).' })
    }
  }, [apiRoute])

  // While a backup runs, ask every few seconds; when it's done, re-render the page (list + last run).
  useEffect(() => {
    if (state.kind !== 'running') return
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${apiRoute}/backups/status`, { credentials: 'include', cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { running: Running | null }
        if (body.running) setState({ kind: 'running', running: body.running })
        else {
          setState({ kind: 'idle' })
          router.refresh()
        }
      } catch {
        // a missed poll is fine; the next one tries again
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [state.kind, apiRoute, router])

  const running = state.kind === 'running' ? state.running : null
  return (
    <div style={{ margin: '0 0 20px' }}>
      <Button buttonStyle="primary" disabled={state.kind === 'starting' || state.kind === 'running'} onClick={start}>
        {state.kind === 'running' ? 'Backup läuft …' : 'Jetzt sichern'}
      </Button>
      <p style={{ margin: '8px 0 0', color: 'var(--theme-elevation-600)' }} role="status">
        {state.kind === 'running'
          ? `${
              running
                ? `Läuft seit ${BERLIN.format(new Date(running.startedAt))} Uhr${running.by ? `, gestartet von ${running.by}` : ' (nächtliche Sicherung)'}`
                : 'Gerade gestartet'
            }. Die Liste aktualisiert sich, sobald das Backup fertig ist.`
          : state.kind === 'error'
            ? state.message
            : 'Sichert Datenbank und Medien sofort, z. B. vor einer größeren Änderung. Die nächtliche Sicherung läuft weiter wie gewohnt.'}
      </p>
    </div>
  )
}
