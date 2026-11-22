import type { LastRestore } from './load'

/** German wording for each outcome `msb-backup restore-live` records (S8.3). Shared by the page and the panel. */
const FAILED: Record<Exclude<LastRestore['code'], 'restored'>, string> = {
  unreadable: 'Das Backup ließ sich nicht lesen. Es wurde nichts verändert.',
  'no-database': 'Im Backup fehlt die Datenbank. Es wurde nichts verändert.',
  damaged: 'Die Datenbank im Backup ist beschädigt. Es wurde nichts verändert.',
  'other-version':
    'Das Backup passt nicht zur jetzigen Version der Website (andere Datenbank-Struktur). Es wurde nichts verändert.',
  'safety-failed': 'Das Sicherheits-Backup vorher ist fehlgeschlagen, deshalb wurde nichts verändert.',
  'media-failed':
    'Beim Kopieren der Medien ist ein Fehler passiert; die Datenbank ist unverändert. Einzelne Dateien können schon ersetzt sein.',
  'database-failed':
    'Die Datenbank ließ sich nicht ersetzen und ist unverändert. Die Medien aus dem Backup sind schon hinzugekommen.',
  unknown: 'Die Wiederherstellung ist fehlgeschlagen. Details stehen im Log des Backup-Dienstes.',
}

export function restoreOutcome(result: LastRestore | null): string {
  if (!result) return 'Das Ergebnis ist unbekannt; der Backup-Dienst hat keins festgehalten. Bitte das Log prüfen.'
  const safety = result.safety ? ` Das Backup vom Stand davor hat die Kennung ${result.safety}.` : ''
  if (result.status === 'ok' && result.code === 'restored') {
    const from = result.source === 'upload' ? 'aus der hochgeladenen Datei' : `Backup ${result.snapshot.slice(0, 8)}`
    return `Die Website ist wiederhergestellt (${from}).${safety} Danach die Website neu veröffentlichen, damit die öffentliche Seite den Stand auch zeigt.`
  }
  return `${FAILED[result.code === 'restored' ? 'unknown' : result.code]}${safety}`
}
