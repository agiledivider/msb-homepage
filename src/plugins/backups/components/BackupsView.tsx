import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import type { CSSProperties } from 'react'
import { isAdmin } from '@/plugins/editorial/access'
import { backupApiConfig, type LastRun, loadBackups } from '../load'
import { BackupNow } from './BackupNow'

const BERLIN = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })
const fmtWhen = (iso: string) => `${BERLIN.format(new Date(iso))} Uhr`
const NUM = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const fmtSize = (bytes: number | null) => {
  if (bytes === null) return 'unbekannt'
  const mb = bytes / 1024 / 1024
  return mb >= 1024 ? `${NUM.format(mb / 1024)} GB` : `${NUM.format(mb)} MB`
}

const box = (tone: 'info' | 'warn' | 'error'): CSSProperties => ({
  padding: '12px 16px',
  borderRadius: 4,
  margin: '0 0 20px',
  border: '1px solid',
  borderColor:
    tone === 'info' ? 'var(--theme-elevation-150)' : `var(--theme-${tone === 'warn' ? 'warning' : 'error'}-500)`,
  background:
    tone === 'info' ? 'var(--theme-elevation-50)' : `var(--theme-${tone === 'warn' ? 'warning' : 'error'}-50)`,
})
const cell: CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--theme-elevation-100)',
  textAlign: 'left',
}

const startedBy = (lastRun: LastRun) => (lastRun.by ? `gestartet von ${lastRun.by}` : 'nächtliche Sicherung')

function LastRunLine({ lastRun }: { lastRun: LastRun | null }) {
  if (!lastRun) return <p>Letzter Lauf: unbekannt (seit dem letzten Neustart des Backup-Dienstes noch keiner).</p>
  return lastRun.status === 'ok' ? (
    <p>
      Letzter Lauf: erfolgreich, {fmtWhen(lastRun.at)} ({startedBy(lastRun)}).
    </p>
  ) : (
    <p style={box('error')}>
      <strong>Der letzte Lauf ist fehlgeschlagen</strong> ({fmtWhen(lastRun.at)}, {startedBy(lastRun)}). Details stehen
      im Log des Backup-Dienstes.
    </p>
  )
}

/** /admin/backups: the site's backups, for admins only (E8: S8.1 list, S8.5 backup now). */
export async function BackupsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const result = await loadBackups(req.user, {
    config: backupApiConfig(process.env),
    fetch: globalThis.fetch,
    now: () => new Date(),
    isAdmin,
    log: (level, m) => req.payload.logger[level](m),
  })

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <h1 style={{ margin: '24px 0 16px' }}>Backups</h1>
        {result.kind === 'forbidden' ? (
          <p style={box('info')}>Diese Seite ist nur für Admins.</p>
        ) : result.kind === 'not-configured' ? (
          <p style={box('info')}>
            Die Backup-Anzeige ist hier nicht eingerichtet (BACKUP_API_URL und BACKUP_API_TOKEN fehlen).
          </p>
        ) : result.kind === 'unavailable' ? (
          <p style={box('error')}>
            Der Backup-Dienst antwortet gerade nicht. Ob Backups laufen, lässt sich hier deshalb nicht sagen; Details
            stehen im Log.
          </p>
        ) : (
          <>
            {result.stale ? (
              <p style={box('warn')}>
                <strong>
                  {result.snapshots.length
                    ? 'Das neueste Backup ist älter als anderthalb Tage.'
                    : 'Es gibt noch kein Backup.'}
                </strong>{' '}
                Die nächtliche Sicherung läuft offenbar nicht; bitte den Backup-Dienst prüfen.
              </p>
            ) : null}
            <BackupNow apiRoute={req.payload.config.routes.api} initialRunning={result.running} />
            <LastRunLine lastRun={result.lastRun} />
            {result.snapshots.length ? (
              <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 720, marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={cell}>Datum</th>
                    <th style={cell}>Größe</th>
                    <th style={cell}>Kennung</th>
                  </tr>
                </thead>
                <tbody>
                  {result.snapshots.map((s) => (
                    <tr key={s.id}>
                      <td style={cell}>{fmtWhen(s.time)}</td>
                      <td style={cell}>{fmtSize(s.sizeBytes)}</td>
                      <td style={{ ...cell, fontFamily: 'var(--font-mono, monospace)' }}>{s.shortId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <p style={{ marginTop: 16, color: 'var(--theme-elevation-600)' }}>
              {result.snapshots.length === 1 ? '1 Backup' : `${result.snapshots.length} Backups`} von Datenbank und
              Medien. Aufbewahrt werden 7 tägliche, 4 wöchentliche und 12 monatliche.
            </p>
          </>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
