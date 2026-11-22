'use client'

import { Button } from '@payloadcms/ui'
import { type CSSProperties, useEffect, useState } from 'react'
import type { LastRestore, Preview } from '../load'
import { restoreOutcome } from '../restoreText'

type Row = { id: string; shortId: string; time: string }
type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; preview: Preview }
  | { kind: 'restoring'; preview: Preview }
  | { kind: 'done'; preview: Preview; result: LastRestore | null }

const BERLIN = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })
const fmtWhen = (iso: string) => `${BERLIN.format(new Date(iso))} Uhr`
const POLL_MS = 3000
const ROWS: [keyof Preview['backup']['counts'], string][] = [
  ['pages', 'Seiten'],
  ['blog', 'Blogbeiträge'],
  ['events', 'Termine'],
  ['media', 'Medien'],
  ['users', 'Benutzerkonten'],
]
const cell: CSSProperties = { padding: '4px 12px 4px 0', textAlign: 'left' }
const box = (tone: 'warn' | 'error'): CSSProperties => ({
  padding: '10px 14px',
  borderRadius: 4,
  margin: '0 0 12px',
  border: `1px solid var(--theme-${tone === 'warn' ? 'warning' : 'error'}-500)`,
  background: `var(--theme-${tone === 'warn' ? 'warning' : 'error'}-50)`,
})
// Payload's "error" button renders like plain text; the one irreversible action here must look like a button.
const dangerButton = (disabled: boolean): CSSProperties => ({
  padding: '8px 16px',
  border: 0,
  borderRadius: 4,
  background: 'var(--theme-error-500)',
  color: '#fff',
  font: 'inherit',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.45 : 1,
})
const show = (n: number | null) => (n === null ? '—' : String(n))

/** Restore the whole site from one backup (S8.3): preview, typed confirmation, progress, outcome. */
export function RestorePanel({ apiRoute, row, onClose }: { apiRoute: string; row: Row; onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [typed, setTyped] = useState('')

  useEffect(() => {
    let live = true
    fetch(`${apiRoute}/backups/preview?id=${row.shortId}`, { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        if (!live) return
        if (!res.ok) throw new Error(String(res.status))
        setState({ kind: 'ready', preview: (await res.json()) as Preview })
      })
      .catch(
        () =>
          live &&
          setState({ kind: 'error', message: 'Das Backup ließ sich nicht prüfen; der Backup-Dienst antwortet nicht.' }),
      )
    return () => {
      live = false
    }
  }, [apiRoute, row.shortId])

  // While restoring, ask for the outcome; the page reloads afterwards, because everything changed.
  useEffect(() => {
    if (state.kind !== 'restoring') return
    const preview = state.preview
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${apiRoute}/backups/status`, { credentials: 'include', cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { running: unknown; lastRestore: LastRestore | null }
        if (body.running) return
        setState({ kind: 'done', preview, result: body.lastRestore })
      } catch {
        // the next poll tries again
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [state, apiRoute])

  const restore = async (preview: Preview) => {
    setState({ kind: 'restoring', preview })
    try {
      const res = await fetch(`${apiRoute}/backups/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.shortId, confirm: typed }),
      })
      if (res.status === 202) return
      setState({
        kind: 'error',
        message:
          res.status === 409
            ? 'Gerade läuft schon ein Backup oder eine Wiederherstellung. Bitte warte, bis es fertig ist.'
            : res.status === 400
              ? 'Die Bestätigung passt nicht zu diesem Backup.'
              : 'Die Wiederherstellung ließ sich nicht starten; der Backup-Dienst antwortet nicht.',
      })
    } catch {
      setState({ kind: 'error', message: 'Die Wiederherstellung ließ sich nicht starten (keine Verbindung).' })
    }
  }

  return (
    <section
      aria-label="Backup wiederherstellen"
      style={{
        maxWidth: 720,
        margin: '20px 0',
        padding: '16px 20px',
        borderRadius: 4,
        border: '1px solid var(--theme-error-500)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Website auf den Stand vom {fmtWhen(row.time)} zurücksetzen</h2>

      {state.kind === 'loading' ? <p role="status">Prüfe das Backup …</p> : null}
      {state.kind === 'error' ? <p style={box('error')}>{state.message}</p> : null}

      {state.kind === 'ready' || state.kind === 'restoring' || state.kind === 'done' ? (
        <>
          <table style={{ borderCollapse: 'collapse', margin: '0 0 12px' }}>
            <thead>
              <tr>
                <th style={cell} />
                <th style={cell}>Jetzt</th>
                <th style={cell}>Im Backup</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([key, label]) => (
                <tr key={key}>
                  <td style={cell}>{label}</td>
                  <td style={cell}>{show(state.preview.live.counts[key])}</td>
                  <td style={cell}>{show(state.preview.backup.counts[key])}</td>
                </tr>
              ))}
              <tr>
                <td style={cell}>Dateien (Bilder, PDFs)</td>
                <td style={cell}>{state.preview.live.mediaFiles}</td>
                <td style={cell}>{state.preview.backup.mediaFiles}</td>
              </tr>
            </tbody>
          </table>

          {state.preview.integrity !== 'ok' ? (
            <p style={box('error')}>
              Die Datenbank in diesem Backup ist beschädigt; es lässt sich nicht wiederherstellen.
            </p>
          ) : !state.preview.compatible ? (
            <p style={box('error')}>
              Dieses Backup stammt aus einer anderen Version der Website (andere Datenbank-Migrationen) und lässt sich
              hier nicht einspielen. Das kann nur jemand mit Zugang zum Server (DEPLOY.md, „Backups“).
            </p>
          ) : state.kind === 'ready' ? (
            <>
              <div style={box('warn')}>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>Alles, was seit dem {fmtWhen(row.time)} geändert wurde, wird ersetzt:</strong> Seiten,
                  Beiträge, Termine, Bilder und auch Benutzerkonten und Rollen. Vielleicht wirst du danach abgemeldet.
                </p>
                <p style={{ margin: 0 }}>
                  Vorher wird automatisch ein Backup des jetzigen Stands gemacht. Damit lässt sich die Wiederherstellung
                  rückgängig machen. Die veröffentlichte Website ändert sich erst, wenn sie neu veröffentlicht wird.
                </p>
              </div>
              <label style={{ display: 'block', margin: '0 0 8px' }}>
                Zur Bestätigung die Kennung <code>{row.shortId}</code> eintippen:
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    display: 'block',
                    marginTop: 4,
                    padding: '6px 8px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={typed.trim() !== row.shortId}
                  onClick={() => restore(state.preview)}
                  style={dangerButton(typed.trim() !== row.shortId)}
                >
                  Website wiederherstellen
                </button>
                <Button buttonStyle="subtle" margin={false} onClick={onClose}>
                  Abbrechen
                </Button>
              </div>
            </>
          ) : state.kind === 'restoring' ? (
            <p role="status">
              Die Wiederherstellung läuft: erst das Sicherheits-Backup, dann Medien und Datenbank. Das kann ein paar
              Minuten dauern; bitte die Seite offen lassen.
            </p>
          ) : (
            <Outcome result={state.result} snapshot={row.id} />
          )}
        </>
      ) : null}

      {state.kind === 'error' ||
      (state.kind === 'ready' && (!state.preview.compatible || state.preview.integrity !== 'ok')) ? (
        <Button buttonStyle="subtle" margin={false} onClick={onClose}>
          Schließen
        </Button>
      ) : null}
    </section>
  )
}

function Outcome({ result, snapshot }: { result: LastRestore | null; snapshot: string }) {
  const ok = result?.status === 'ok' && snapshot.startsWith(result.snapshot.slice(0, 8))
  return (
    <div role="status">
      <p style={ok ? { margin: '0 0 8px' } : box('error')}>{restoreOutcome(result)}</p>
      <Button buttonStyle="primary" margin={false} onClick={() => window.location.reload()}>
        Seite neu laden
      </Button>
    </div>
  )
}
