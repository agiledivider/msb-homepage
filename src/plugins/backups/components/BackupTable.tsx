'use client'

import { Button } from '@payloadcms/ui'
import { type CSSProperties, useState } from 'react'
import { fmtSize } from '../format'
import { generatePassphrase } from '../passphrase'
import { RestorePanel } from './RestorePanel'

type Row = { id: string; shortId: string; time: string; sizeBytes: number | null; beforeRestore: boolean }

const BERLIN = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })
const fmtWhen = (iso: string) => `${BERLIN.format(new Date(iso))} Uhr`

const cell: CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--theme-elevation-100)',
  textAlign: 'left',
}
const mono: CSSProperties = { fontFamily: 'var(--font-mono, monospace)' }
const ITERATIONS = 600000

/** Backups list with an encrypted download per backup (S8.1 list, S8.2 download). */
export function BackupTable({ apiRoute, snapshots }: { apiRoute: string; snapshots: Row[] }) {
  const [picked, setPicked] = useState<{ row: Row; action: 'download' | 'restore' } | null>(null)
  return (
    <>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 720, marginTop: 8 }}>
        <thead>
          <tr>
            <th style={cell}>Datum</th>
            <th style={cell}>Größe</th>
            <th style={cell}>Kennung</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => (
            <tr key={s.id}>
              <td style={cell}>{fmtWhen(s.time)}</td>
              <td style={cell}>{fmtSize(s.sizeBytes)}</td>
              <td style={cell}>
                <span style={mono}>{s.shortId}</span>
                {s.beforeRestore ? (
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--theme-elevation-600)' }}>
                    vor Wiederherstellung
                  </span>
                ) : null}
              </td>
              <td style={{ ...cell, display: 'flex', gap: 6 }}>
                <Button
                  buttonStyle="secondary"
                  size="small"
                  margin={false}
                  onClick={() => setPicked({ row: s, action: 'download' })}
                >
                  Herunterladen
                </Button>
                <Button
                  buttonStyle="subtle"
                  size="small"
                  margin={false}
                  onClick={() => setPicked({ row: s, action: 'restore' })}
                >
                  Wiederherstellen
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {picked?.action === 'download' ? (
        <DownloadPanel key={picked.row.id} apiRoute={apiRoute} row={picked.row} onClose={() => setPicked(null)} />
      ) : picked?.action === 'restore' ? (
        <RestorePanel
          key={picked.row.id}
          apiRoute={apiRoute}
          source={{ kind: 'backup', row: picked.row }}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </>
  )
}

function DownloadPanel({ apiRoute, row, onClose }: { apiRoute: string; row: Row; onClose: () => void }) {
  const [passphrase, setPassphrase] = useState(() => generatePassphrase(row.shortId))
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [started, setStarted] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(passphrase)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  const renew = () => {
    setPassphrase(generatePassphrase(row.shortId))
    setCopied(false)
    setSaved(false)
    setStarted(false)
  }

  return (
    <section
      aria-label="Backup herunterladen"
      style={{
        maxWidth: 720,
        margin: '20px 0',
        padding: '16px 20px',
        borderRadius: 4,
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Backup vom {fmtWhen(row.time)} herunterladen</h2>
      <p style={{ margin: '0 0 12px' }}>
        Die Datei enthält alles, auch Benutzerkonten und Entwürfe. Sie wird deshalb mit diesem Passwort verschlüsselt.
        Speichere es jetzt, z. B. im Passwort-Manager: ohne das Passwort lässt sich die Datei nicht öffnen, und es wird
        nirgends gespeichert. Es beginnt mit der Kennung des Backups ({row.shortId}), die auch im Dateinamen steht.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
        <code
          data-testid="backup-passphrase"
          style={{
            ...mono,
            fontSize: 18,
            padding: '6px 10px',
            background: 'var(--theme-bg)',
            borderRadius: 4,
            userSelect: 'all',
          }}
        >
          {passphrase}
        </code>
        <Button buttonStyle="secondary" size="small" margin={false} onClick={copy}>
          {copied ? 'Kopiert ✓' : 'Kopieren'}
        </Button>
        <Button buttonStyle="subtle" size="small" margin={false} onClick={renew}>
          Neues Passwort
        </Button>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 12px' }}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        Ich habe das Passwort gespeichert.
      </label>
      {/* A real form post: the browser saves the answer as a file, and the passphrase stays out of every URL. */}
      <form method="post" action={`${apiRoute}/backups/download`} onSubmit={() => setStarted(true)}>
        <input type="hidden" name="id" value={row.shortId} />
        <input type="hidden" name="passphrase" value={passphrase} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="submit" buttonStyle="primary" margin={false} disabled={!saved}>
            Verschlüsselt herunterladen
          </Button>
          <Button buttonStyle="subtle" margin={false} onClick={onClose}>
            Schließen
          </Button>
        </div>
      </form>
      {started ? (
        <p role="status" style={{ margin: '12px 0 0' }}>
          Der Download läuft. Bei großen Backups kann er ein paar Minuten dauern.
        </p>
      ) : null}
      <details style={{ marginTop: 12 }}>
        <summary>So öffnest du die Datei</summary>
        <p style={{ margin: '8px 0 4px' }}>Im Terminal (macOS, Linux; fragt nach dem Passwort):</p>
        <pre style={{ ...mono, whiteSpace: 'pre-wrap', margin: 0 }}>
          {`openssl enc -d -aes-256-cbc -pbkdf2 -iter ${ITERATIONS} -md sha256 -in msb-backup-….tar.gz.enc -out backup.tar.gz\ntar -xzf backup.tar.gz`}
        </pre>
        <p style={{ margin: '4px 0 0' }}>
          Darin: die Datenbank unter <code>work/db/msb.db</code>, die Medien unter <code>volumes/media/</code>.
        </p>
      </details>
    </section>
  )
}
