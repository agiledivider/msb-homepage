import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import type { CSSProperties } from 'react'
import { isAdmin } from '@/plugins/editorial/access'
import { fmtSize } from '../format'
import { backupApiConfig, type LastRestore, type LastRun, loadBackups, type StorageState } from '../load'
import { restoreOutcome } from '../restoreText'
import { BackupNow } from './BackupNow'
import { BackupTable } from './BackupTable'
import { UploadRestore } from './UploadRestore'

const BERLIN = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })
const fmtWhen = (iso: string) => `${BERLIN.format(new Date(iso))} Uhr`

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

const startedBy = (lastRun: LastRun) => (lastRun.by ? `gestartet von ${lastRun.by}` : 'nächtliche Sicherung')

function LastRestoreLine({ lastRestore }: { lastRestore: LastRestore | null }) {
  if (!lastRestore) return null
  const who = lastRestore.by ? ` von ${lastRestore.by}` : ''
  return (
    <p style={lastRestore.status === 'ok' ? undefined : box('error')}>
      <strong>Letzte Wiederherstellung</strong> ({fmtWhen(lastRestore.at)}
      {who}): {restoreOutcome(lastRestore)}
    </p>
  )
}

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

/** S9.2: how much room the backups take and, where the storage says, how much is left. */
function StorageLine({ storage }: { storage: StorageState }) {
  switch (storage.kind) {
    case 'unknown':
      return <p>Speicherplatz: gerade nicht abrufbar; Details stehen im Log des Backup-Dienstes.</p>
    case 'no-limit':
      return (
        <p>
          Speicherplatz: Die Backups belegen {fmtSize(storage.usedBytes)}. Der Backup-Speicher meldet keine Obergrenze,
          deshalb lässt sich nicht sagen, wie viel noch frei ist.
        </p>
      )
    case 'ok':
      return (
        <p>
          Speicherplatz: Die Backups belegen {fmtSize(storage.usedBytes)}; frei sind {fmtSize(storage.freeBytes)} von{' '}
          {fmtSize(storage.totalBytes)}.
        </p>
      )
    case 'low':
      return (
        <p style={box('warn')}>
          <strong>Der Backup-Speicher ist fast voll:</strong> frei sind nur noch {fmtSize(storage.freeBytes)} von{' '}
          {fmtSize(storage.totalBytes)} (die Backups belegen {fmtSize(storage.usedBytes)}). Wenn er voll ist, schlagen
          die nächtlichen Backups fehl; bitte den Speicher rechtzeitig vergrößern.
        </p>
      )
    default:
      return storage satisfies never
  }
}

/** /admin/backups: the site's backups, for admins only (E8: S8.1 list, S8.5 backup now; S9.2 storage, S9.3 unchanged backups). */
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
            {/* a nearly full storage goes on top, with the other warnings */}
            {result.storage.kind === 'low' ? <StorageLine storage={result.storage} /> : null}
            <BackupNow apiRoute={req.payload.config.routes.api} initialRunning={result.running} />
            <LastRunLine lastRun={result.lastRun} />
            <LastRestoreLine lastRestore={result.lastRestore} />
            {result.storage.kind === 'low' ? null : <StorageLine storage={result.storage} />}
            {result.snapshots.length ? (
              <BackupTable apiRoute={req.payload.config.routes.api} snapshots={result.snapshots} />
            ) : null}
            <UploadRestore apiRoute={req.payload.config.routes.api} />
            <p style={{ marginTop: 16, color: 'var(--theme-elevation-600)' }}>
              {result.snapshots.length === 1 ? '1 Backup' : `${result.snapshots.length} Backups`} von Datenbank und
              Medien. Aufbewahrt werden 7 tägliche, 4 wöchentliche und 12 monatliche. Grau: gleicher Inhalt wie das
              Backup davor (an ruhigen Tagen); auch diese lassen sich herunterladen und wiederherstellen.
            </p>
          </>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
