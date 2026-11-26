/**
 * What a page view counts as (S5.11, D-012). Pure rules, no I/O: the endpoint
 * (src/plugins/stats/endpoint.ts) feeds them the request, recordHit stores the
 * result as per-day totals. Nothing here keeps anything about the visitor: no
 * IP, no user agent, no hash, no ID. A "visit" is a page load that arrived
 * from outside the site (another site, a search, a typed address), so it needs
 * no cookie or storage on the visitor's device.
 */
import { z } from 'zod'

/** Body the beacon sends: path, the browser's referrer, and whether it was an in-site (soft) navigation. */
const HitSchema = z.object({
  p: z.string().min(1).max(500),
  r: z.string().max(2000).optional(),
  n: z.boolean().optional(),
})

export type SourceKind = 'search' | 'social' | 'site' | 'direct'
export type Source = { kind: SourceKind; source: string }

/** One counted page view, ready to store. `source` only when it is a visit. */
export type Hit = { day: string; path: string; visit: boolean; source: Source | null }

/** Paths that are never counted: the CMS, its API, preview and Next internals. */
const SKIP_PREFIXES = ['/admin', '/api', '/next', '/preview', '/_next']

/** The page's path without query, hash or trailing slash; null when it must not be counted. */
export function normalizePath(raw: string): string | null {
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  let path = raw.split(/[?#]/)[0] ?? ''
  if (path.length > 1) path = path.replace(/\/+$/, '')
  if (path.length === 0 || path.length > 200) return null
  if (/[^\x21-\x7e]/.test(path)) return null // the site's own paths are plain ASCII slugs
  if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null
  return path
}

/** `com`, a country code, or `co.<cc>` / `com.<cc>`: google.de, google.co.uk, google.com.tr. */
const TLD = String.raw`(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})`
const brand = (name: string) => new RegExp(String.raw`(^|\.)${name}\.${TLD}$`)

const SEARCH = [
  brand('google'),
  /(^|\.)bing\.com$/,
  /(^|\.)duckduckgo\.com$/,
  /(^|\.)ecosia\.org$/,
  /(^|\.)qwant\.com$/,
  /(^|\.)startpage\.com$/,
  /^search\.brave\.com$/,
  brand('yahoo'),
  brand('yandex'),
  /(^|\.)baidu\.com$/,
  /(^|\.)metager\.(de|org)$/,
  /(^|\.)kagi\.com$/,
  /(^|\.)mojeek\.com$/,
  /^com\.google\.android\.googlequicksearchbox$/,
]
const SOCIAL = [
  /(^|\.)facebook\.com$/,
  /^fb\.me$/,
  /(^|\.)instagram\.com$/,
  /^t\.co$/,
  /(^|\.)twitter\.com$/,
  /^x\.com$/,
  /(^|\.)linkedin\.com$/,
  /^lnkd\.in$/,
  /(^|\.)reddit\.com$/,
  /(^|\.)youtube\.com$/,
  /^youtu\.be$/,
  brand('pinterest'),
  /(^|\.)threads\.net$/,
  /^bsky\.app$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)xing\.com$/,
  /^mastodon\.[a-z.]+$/,
  /^chaos\.social$/,
  /^troet\.cafe$/,
  /^bonn\.social$/,
  /^norden\.social$/,
  /^social\.bonn\.de$/,
  /^com\.(facebook\.katana|instagram\.android|linkedin\.android|twitter\.android)$/,
  /^org\.joinmastodon\.android$/,
]

/** Host as shown in the dashboard: lowercase, without `www.` / `m.` / Facebook's `l.` and `lm.` link hops. */
export function normalizeHost(host: string): string {
  return host
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^(www\d*|m|l|lm|mobile)\./, '')
}

/**
 * Where a visit came from, by the referrer's host only (the path and query are
 * dropped: they may hold search terms). Android apps send `android-app://<package>`.
 */
export function classifySource(referrer: string | undefined): Source {
  if (!referrer) return { kind: 'direct', source: 'direkt' }
  let host: string
  try {
    const url = new URL(referrer)
    if (!['http:', 'https:', 'android-app:'].includes(url.protocol)) return { kind: 'direct', source: 'direkt' }
    host = normalizeHost(url.hostname)
  } catch {
    return { kind: 'direct', source: 'direkt' }
  }
  if (!host || host.length > 100) return { kind: 'direct', source: 'direkt' }
  if (SEARCH.some((re) => re.test(host))) return { kind: 'search', source: host }
  if (SOCIAL.some((re) => re.test(host))) return { kind: 'social', source: host }
  return { kind: 'site', source: host }
}

/** Automated clients (most never run the beacon's script, these few do). Checked, never stored. */
const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|go-http|node-fetch|axios|okhttp|java\//i
export const isBot = (userAgent: string | null): boolean => !userAgent || BOT_UA.test(userAgent)

const BERLIN_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The Berlin calendar day of an instant, `YYYY-MM-DD`: the bucket a hit is counted in. */
export const berlinDay = (now: Date): string => BERLIN_DAY.format(now)

/**
 * Turns a beacon body into a hit, or null when it isn't one we count. `ownHost`
 * is the site's own host: a referrer from there is a click inside the site,
 * not a new visit (full page loads between pages still send the site as referrer).
 */
export function parseHit(body: unknown, ownHost: string, now: Date): Hit | null {
  const parsed = HitSchema.safeParse(body)
  if (!parsed.success) return null
  const path = normalizePath(parsed.data.p)
  if (!path) return null
  const internal = parsed.data.n === true || refHost(parsed.data.r) === normalizeHost(ownHost)
  const day = berlinDay(now)
  if (internal) return { day, path, visit: false, source: null }
  return { day, path, visit: true, source: classifySource(parsed.data.r) }
}

function refHost(referrer: string | undefined): string | null {
  if (!referrer) return null
  try {
    return normalizeHost(new URL(referrer).host)
  } catch {
    return null
  }
}
