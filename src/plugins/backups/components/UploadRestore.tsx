'use client'

import { Button } from '@payloadcms/ui'
import { type CSSProperties, useState } from 'react'
import type { ContentsPreview } from '../load'
import { idFromFileName, idFromPassphrase, isValidPassphrase } from '../passphrase'
import { RestorePanel } from './RestorePanel'

type State =
  | { kind: 'pick' }
  | { kind: 'uploading'; percent: number }
  | { kind: 'checking'; uploadId: string }
  | { kind: 'retry'; uploadId: string; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'checked'; uploadId: string; preview: ContentsPreview }

const errorBox: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 4,
  margin: '12px 0',
  border: '1px solid var(--theme-error-500)',
  background: 'var(--theme-error-50)',
}
const input: CSSProperties = { display: 'block', marginTop: 4, padding: '6px 8px' }

/** Upload with progress; `fetch` can't report upload progress, XMLHttpRequest can. */
function send(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let body: unknown = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {}
      resolve({ status: xhr.status, body })
    }
    xhr.onerror = () => reject(new Error('network'))
    xhr.send(file)
  })
}

/** Restore the site from a file downloaded earlier (S8.4): upload, password, check, then the restore panel. */
export function UploadRestore({ apiRoute }: { apiRoute: string }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [state, setState] = useState<State>({ kind: 'pick' })

  const post = (path: string, body: unknown) =>
    fetch(`${apiRoute}/backups/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const check = async (uploadId: string) => {
    setState({ kind: 'checking', uploadId })
    try {
      const res = await post('upload-check', { uploadId, passphrase: passphrase.trim() })
      const body = (await res.json().catch(() => ({}))) as { code?: string }
      if (res.ok) return setState({ kind: 'checked', uploadId, preview: body as ContentsPreview })
      if (res.status === 422 && body.code === 'wrong-password')
        return setState({
          kind: 'retry',
          uploadId,
          message: 'Das Passwort passt nicht zu dieser Datei (oder sie ist beschädigt).',
        })
      if (res.status === 422 && body.code === 'not-a-backup')
        return setState({ kind: 'error', message: 'Diese Datei ist kein Backup dieser Website.' })
      if (res.status === 404)
        return setState({
          kind: 'error',
          message: 'Die hochgeladene Datei ist nicht mehr da. Bitte noch einmal hochladen.',
        })
      setState({ kind: 'error', message: 'Die Datei ließ sich nicht prüfen; der Backup-Dienst antwortet nicht.' })
    } catch {
      setState({ kind: 'error', message: 'Die Datei ließ sich nicht prüfen (keine Verbindung).' })
    }
  }

  const upload = async () => {
    if (!file) return
    setState({ kind: 'uploading', percent: 0 })
    try {
      const res = await send(`${apiRoute}/backups/upload`, file, (percent) => setState({ kind: 'uploading', percent }))
      const uploadId = (res.body as { uploadId?: string } | null)?.uploadId
      if (res.status === 201 && uploadId) return check(uploadId)
      setState({
        kind: 'error',
        message:
          res.status === 413
            ? 'Die Datei ist zu groß.'
            : res.status === 409
              ? 'Gerade läuft ein Backup oder eine Wiederherstellung. Bitte warte, bis es fertig ist.'
              : 'Das Hochladen ist fehlgeschlagen; der Backup-Dienst antwortet nicht.',
      })
    } catch {
      setState({ kind: 'error', message: 'Das Hochladen ist fehlgeschlagen (keine Verbindung).' })
    }
  }

  const reset = async () => {
    const uploadId = 'uploadId' in state ? state.uploadId : null
    if (uploadId) await post('upload-discard', { uploadId }).catch(() => {})
    setState({ kind: 'pick' })
    setFile(null)
    setPassphrase('')
  }

  if (state.kind === 'checked') {
    return (
      <RestorePanel
        apiRoute={apiRoute}
        source={{ kind: 'upload', uploadId: state.uploadId, preview: state.preview }}
        onClose={reset}
      />
    )
  }

  // File name and password both carry the backup id (S8.2): say so when they don't belong together.
  const fileId = file ? idFromFileName(file.name) : null
  const passId = idFromPassphrase(passphrase)
  const mismatch = fileId && passId && fileId !== passId ? { fileId, passId } : null

  const busy = state.kind === 'uploading' || state.kind === 'checking'
  return (
    <section aria-label="Aus einer Datei wiederherstellen" style={{ maxWidth: 720, margin: '24px 0' }}>
      {!open ? (
        <Button buttonStyle="subtle" margin={false} onClick={() => setOpen(true)}>
          Aus einer Backup-Datei wiederherstellen …
        </Button>
      ) : (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 4,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Aus einer Backup-Datei wiederherstellen</h2>
          <p style={{ margin: '0 0 12px' }}>
            Eine Datei, die hier heruntergeladen wurde (<code>msb-backup-….tar.gz.enc</code>), und ihr Passwort. Die
            Datei wird erst geprüft; vor dem Wiederherstellen siehst du, was sie enthält.
          </p>
          <label style={{ display: 'block', margin: '0 0 10px' }}>
            Backup-Datei
            <input
              type="file"
              accept=".enc"
              disabled={busy || state.kind === 'retry'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={input}
            />
          </label>
          {fileId ? (
            <p style={{ margin: '-4px 0 10px', color: 'var(--theme-elevation-600)' }}>Backup {fileId}</p>
          ) : null}
          <label style={{ display: 'block', margin: '0 0 12px' }}>
            Passwort
            <input
              type="password"
              value={passphrase}
              autoComplete="off"
              disabled={busy}
              onChange={(e) => setPassphrase(e.target.value)}
              style={{ ...input, width: 320, fontFamily: 'var(--font-mono, monospace)' }}
            />
          </label>
          {mismatch ? (
            <p style={{ ...errorBox, borderColor: 'var(--theme-warning-500)', background: 'var(--theme-warning-50)' }}>
              Das Passwort gehört zu Backup <code>{mismatch.passId}</code>, die Datei ist Backup{' '}
              <code>{mismatch.fileId}</code>. Vermutlich passen sie nicht zusammen.
            </p>
          ) : null}
          {state.kind === 'uploading' ? (
            <p role="status">
              Lädt hoch … {state.percent} %
              <progress value={state.percent} max={100} style={{ display: 'block', width: 320 }} />
            </p>
          ) : null}
          {state.kind === 'checking' ? <p role="status">Entschlüssele und prüfe die Datei …</p> : null}
          {state.kind === 'retry' || state.kind === 'error' ? <p style={errorBox}>{state.message}</p> : null}
          <div style={{ display: 'flex', gap: 8 }}>
            {state.kind === 'retry' ? (
              <Button
                buttonStyle="primary"
                margin={false}
                disabled={!isValidPassphrase(passphrase.trim())}
                onClick={() => check(state.uploadId)}
              >
                Mit diesem Passwort noch einmal prüfen
              </Button>
            ) : (
              <Button
                buttonStyle="primary"
                margin={false}
                disabled={busy || !file || !isValidPassphrase(passphrase.trim())}
                onClick={upload}
              >
                Hochladen und prüfen
              </Button>
            )}
            <Button
              buttonStyle="subtle"
              margin={false}
              disabled={busy}
              onClick={async () => {
                await reset()
                setOpen(false)
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
