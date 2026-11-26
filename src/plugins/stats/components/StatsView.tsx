import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { isCmsUser } from '@/access/admin'
import type { SourceKind } from '@/lib/stats/hit'
import {
  type DayTotal,
  loadStats,
  type PageKind,
  type PageTotal,
  PRESETS,
  pageKind,
  parsePeriod,
  type SourceTotal,
  titlesFor,
} from '../load'

const NUM = new Intl.NumberFormat('de-DE')
const AVG = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const DAY_LONG = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
const DAY_SHORT = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
// Berlin days are stored as plain dates; format them as such (noon UTC, no zone shift).
const asDate = (day: string) => new Date(`${day}T12:00:00Z`)
const fmtLong = (day: string) => DAY_LONG.format(asDate(day))
const fmtShort = (day: string) => DAY_SHORT.format(asDate(day))

const PRESET_LABEL: Record<number, string> = {
  7: '7 Tage',
  30: '30 Tage',
  90: '90 Tage',
  365: '12 Monate',
}

const KIND_LABEL: Record<SourceKind, string> = {
  search: 'Suchmaschinen',
  social: 'Soziale Netzwerke',
  site: 'Andere Websites',
  direct: 'Direkt / unbekannt',
}
const KINDS: SourceKind[] = ['search', 'social', 'site', 'direct']

const LIST_LABEL: Record<PageKind, string> = { page: 'Seiten', post: 'Blogbeiträge', event: 'Termine' }
const TOP = 10

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="msb-stats__tile">
      <div className="msb-stats__tile-label">{label}</div>
      <div className="msb-stats__tile-value">{value}</div>
      {hint ? <div className="msb-stats__tile-hint">{hint}</div> : null}
    </div>
  )
}

/** Visits per day: one series, so no legend (the heading names it); hover shows the day's numbers. */
function DayChart({ days }: { days: DayTotal[] }) {
  const max = Math.max(1, ...days.map((d) => d.visits))
  const first = days[0]
  const last = days.at(-1)
  return (
    <figure className="msb-stats__chart" aria-label="Besuche pro Tag">
      <div className="msb-stats__plot" data-dense={days.length > 120 ? 'true' : undefined}>
        <span className="msb-stats__max">{NUM.format(max)}</span>
        {days.map((d) => (
          <div key={d.day} className="msb-stats__col">
            <div
              className="msb-stats__bar"
              style={{ height: d.visits === 0 ? '1px' : `${(d.visits / max) * 100}%` }}
              data-zero={d.visits === 0 ? 'true' : undefined}
            />
            <div className="msb-stats__tip" role="tooltip">
              <strong>{fmtLong(d.day)}</strong>
              <br />
              {NUM.format(d.visits)} Besuche · {NUM.format(d.views)} Aufrufe
            </div>
          </div>
        ))}
      </div>
      {first && last ? (
        <figcaption className="msb-stats__axis">
          <span>{fmtShort(first.day)}</span>
          <span>{fmtShort(last.day)}</span>
        </figcaption>
      ) : null}
      <details className="msb-stats__table">
        <summary>Als Tabelle</summary>
        <table>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Besuche</th>
              <th>Aufrufe</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day}>
                <td>{fmtLong(d.day)}</td>
                <td>{NUM.format(d.visits)}</td>
                <td>{NUM.format(d.views)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

function PageList({
  kind,
  pages,
  titles,
  siteUrl,
}: {
  kind: PageKind
  pages: PageTotal[]
  titles: Map<string, string>
  siteUrl: string
}) {
  return (
    <section className="msb-stats__card">
      <h3>{LIST_LABEL[kind]}</h3>
      {pages.length === 0 ? (
        <p className="msb-stats__empty">In diesem Zeitraum keine Aufrufe.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Aufrufe</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.path}>
                <td>
                  <a href={`${siteUrl}${p.path}`} target="_blank" rel="noreferrer">
                    {titles.get(p.path) ?? p.path}
                  </a>
                  {titles.has(p.path) ? <span className="msb-stats__path">{p.path}</span> : null}
                </td>
                <td>{NUM.format(p.views)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Sources({ sources, total }: { sources: SourceTotal[]; total: number }) {
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)} %` : '–')
  return (
    <section className="msb-stats__card">
      <h3>Herkunft der Besuche</h3>
      <table>
        <tbody>
          {KINDS.map((kind) => {
            const rows = sources.filter((s) => s.kind === kind)
            const sum = rows.reduce((a, s) => a + s.visits, 0)
            return (
              <tr key={kind}>
                <td>
                  <strong>{KIND_LABEL[kind]}</strong>
                  {kind !== 'direct' && rows.length > 0 ? (
                    <ul className="msb-stats__hosts">
                      {rows.slice(0, TOP).map((s) => (
                        <li key={s.source}>
                          {s.source} <span>{NUM.format(s.visits)}</span>
                        </li>
                      ))}
                      {rows.length > TOP ? <li>und {rows.length - TOP} weitere</li> : null}
                    </ul>
                  ) : null}
                </td>
                <td>{NUM.format(sum)}</td>
                <td>{pct(sum)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function PeriodPicker({ preset, from, to, base }: { preset: number | null; from: string; to: string; base: string }) {
  return (
    <nav className="msb-stats__period" aria-label="Zeitraum">
      {PRESETS.map((n) => (
        <a key={n} href={`${base}?tage=${n}`} aria-current={preset === n ? 'true' : undefined}>
          {PRESET_LABEL[n]}
        </a>
      ))}
      <form method="get" action={base}>
        <label>
          von <input type="date" name="von" defaultValue={from} />
        </label>
        <label>
          bis <input type="date" name="bis" defaultValue={to} />
        </label>
        <button type="submit">Anzeigen</button>
      </form>
    </nav>
  )
}

/**
 * /admin/statistik (S5.11): how the public site is used, from the per-day
 * totals the beacon collects (D-012). Any CMS user may look; there is nothing
 * personal in it to protect.
 */
export async function StatsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const base = `${req.payload.config.routes.admin}/statistik`
  const template = {
    i18n: req.i18n,
    locale,
    params,
    payload: req.payload,
    permissions,
    searchParams,
    user: req.user ?? undefined,
    visibleEntities,
  }

  // Payload doesn't guard custom views: without a CMS login, go to the login page and come back.
  if (!isCmsUser(req.user)) redirect(`${req.payload.config.routes.admin}/login?redirect=${encodeURIComponent(base)}`)

  const period = parsePeriod(searchParams ?? {}, new Date())
  const stats = await loadStats(req.payload, period)
  const visits = stats.days.reduce((a, d) => a + d.visits, 0)
  const views = stats.days.reduce((a, d) => a + d.views, 0)
  const lists = (['page', 'post', 'event'] as const).map((kind) => ({
    kind,
    pages: stats.pages.filter((p) => pageKind(p.path) === kind).slice(0, TOP),
  }))
  const titles = await titlesFor(
    req.payload,
    lists.flatMap((l) => l.pages.map((p) => p.path)),
  )
  const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
  const startsBeforeData = stats.since !== null && stats.since > period.from
  // Average over the days that were actually counted, not the empty ones before counting began.
  const countedDays = stats.days.filter((d) => stats.since !== null && d.day >= stats.since).length
  const avg = countedDays > 0 ? visits / countedDays : null
  const average = avg === null ? '–' : avg < 10 ? AVG.format(avg) : NUM.format(Math.round(avg))
  const averageHint = !startsBeforeData
    ? 'im Schnitt'
    : countedDays === 1
      ? 'bisher nur ein gezählter Tag'
      : `im Schnitt der ${countedDays} gezählten Tage`

  return (
    <DefaultTemplate {...template}>
      <Gutter>
        <div className="msb-stats">
          <h1>Statistik</h1>
          <p className="msb-stats__lede">
            Wie die öffentliche Website genutzt wird: gezählt ohne Cookies und ohne etwas über einzelne Besucher zu
            speichern. Ein Besuch ist ein Aufruf, der von außen kommt (Suche, Link, getippte Adresse); Klicks innerhalb
            der Website zählen als weitere Aufrufe. Angemeldete CMS-Nutzer, Bots und Browser mit „Do Not Track“ werden
            nicht gezählt.
          </p>

          <PeriodPicker preset={period.preset} from={period.from} to={period.to} base={base} />

          <p className="msb-stats__range">
            {fmtLong(period.from)} bis {fmtLong(period.to)}
            {stats.since === null
              ? ' · Bisher wurde noch nichts gezählt.'
              : startsBeforeData
                ? ` · Gezählt wird erst seit ${fmtLong(stats.since)}.`
                : ''}
          </p>

          <div className="msb-stats__tiles">
            <Tile label="Besuche" value={NUM.format(visits)} />
            <Tile label="Seitenaufrufe" value={NUM.format(views)} />
            <Tile label="Besuche pro Tag" value={average} hint={averageHint} />
          </div>

          <h2>Besuche pro Tag</h2>
          <DayChart days={stats.days} />

          <h2>Meistgelesen</h2>
          <div className="msb-stats__grid">
            {lists.map((l) => (
              <PageList key={l.kind} kind={l.kind} pages={l.pages} titles={titles} siteUrl={siteUrl} />
            ))}
          </div>

          <h2>Woher die Besuche kommen</h2>
          <Sources sources={stats.sources} total={visits} />
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
