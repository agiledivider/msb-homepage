/**
 * publish-static.ts — snapshot the public site into a fully static bundle.
 *
 * A literal `next export` is impossible here: the same Next app also hosts the
 * Payload admin and `/api/*`, and every frontend route is `force-dynamic`. So
 * instead we build the app, run it locally, and crawl the *published*
 * (anonymous) pages over HTTP into `dist/` — plain HTML/CSS/JS that nginx or
 * classic Apache webspace can serve with no Node, no database and no Payload.
 *
 * Beyond the crawl it also:
 *   - pre-generates a WebP width ladder for every referenced image, replacing
 *     the `/_next/image` optimizer that a static host doesn't have,
 *   - copies only the media the site actually references,
 *   - writes robots.txt + sitemap.xml,
 *   - emits nginx.conf and dist/.htaccess, including the legacy Joomla 301s
 *     that `src/proxy.ts` normally handles at request time.
 *
 * Run: `pnpm publish:static`
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { ALL_WIDTHS } from '../src/lib/imageWidths.mjs'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
// A dedicated port so we never collide with (and accidentally crawl) a
// `pnpm dev` server the user may already have running on 3000.
const PORT = process.env.PUBLISH_PORT || '4321'
const ORIGIN = `http://localhost:${PORT}`
/** Public origin baked into sitemap.xml / robots.txt. */
const SITE_URL = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')
const WEBP_QUALITY = 78
/** How many images to transcode at once. */
const CONCURRENCY = 4

/**
 * Environment for the spawned build/serve steps.
 *
 * Must be read at spawn time, not module load: the publisher service imports
 * this module at startup and only then points `DATABASE_URI` at its private
 * copy of the SQLite file. Snapshotting it as a constant made the build fall
 * back to the default path and quietly render every page against an empty
 * database.
 */
const buildEnv = () => ({ ...process.env, STATIC_EXPORT: 'true', PORT })

/**
 * Invoke Next through its local binary rather than `pnpm build` / `pnpm exec`.
 * The publisher image installs dependencies but deliberately ships no package
 * manager, and this works identically on a dev machine.
 */
const NEXT_BIN = path.join(ROOT, 'node_modules', '.bin', 'next')
const PKG_RUN = {
  build: [NEXT_BIN, 'build'],
  start: (port: string) => [NEXT_BIN, 'start', '-p', port],
}

/**
 * Run a command to completion **without blocking the event loop**.
 *
 * Deliberately not `execSync`: the publisher service hosts an HTTP API in the
 * same process, and a synchronous `next build` freezes it for the whole build —
 * so `/status` times out exactly when someone is watching a publish, the
 * debounce and nightly timers fire late, and the healthcheck can flap.
 */
function run(argv: string[], env: NodeJS.ProcessEnv, onLine?: (line: string) => void): Promise<void> {
  const [cmd, ...args] = argv
  return new Promise((resolve, reject) => {
    // Pipe rather than inherit when a caller wants to watch the output, and
    // echo it on so `docker compose logs` still shows the build verbatim.
    const child = spawn(cmd, args, { stdio: onLine ? ['ignore', 'pipe', 'pipe'] : 'inherit', env, cwd: ROOT })
    if (onLine) {
      const scan = (buf: Buffer) => {
        const text = buf.toString()
        process.stdout.write(text)
        for (const line of text.split('\n')) if (line.trim()) onLine(line)
      }
      child.stdout?.on('data', scan)
      child.stderr?.on('data', scan)
    }
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))))
  })
}

/**
 * Milestones Next prints during a production build, with how far through the
 * build each one means we are. Without these the build is a single opaque step
 * that occupies ~40% of the wall clock — a progress bar frozen there looks
 * broken, and "what is it doing?" has no answer.
 */
const BUILD_MARKERS: Array<{ re: RegExp; at: number; label: string }> = [
  { re: /Creating an optimized production build/i, at: 0.05, label: 'kompilieren' },
  { re: /Compiled successfully/i, at: 0.45, label: 'TypeScript prüfen' },
  { re: /Running TypeScript/i, at: 0.5, label: 'TypeScript prüfen' },
  { re: /Finished TypeScript/i, at: 0.7, label: 'Seitendaten sammeln' },
  { re: /Collecting page data/i, at: 0.75, label: 'Seitendaten sammeln' },
  { re: /Generating static pages/i, at: 0.85, label: 'Seiten erzeugen' },
  { re: /Finalizing page optimization|Collecting build traces/i, at: 0.95, label: 'abschließen' },
]

/**
 * Media source directories and the URL prefixes they're served under. Payload
 * emits `/api/media/file/<name>` while `public/media` is also reachable at
 * `/media/<name>`, so either form can appear depending on how a doc was
 * populated — both are covered.
 */
const MEDIA_SOURCES = [
  { dir: path.join(ROOT, 'public', 'media'), prefixes: ['/media', '/api/media/file'] },
  { dir: path.join(ROOT, 'public', 'diday'), prefixes: ['/diday'] },
  // Fixed site images rendered through next/image (e.g. the fallback map).
  { dir: path.join(ROOT, 'public', 'brand'), prefixes: ['/brand'] },
]
/** Copied wholesale (small, and referenced by plain <img src>). */
const PUBLIC_SKIP = new Set(['media', 'diday', 'brand'])

const RASTER_RE = /\.(jpe?g|png|webp)$/i

/**
 * Coarse progress reporting, so a caller hosting a UI can say what is happening
 * rather than just "running". Stage keys are stable identifiers; the caller owns
 * the labels and the overall step ordering (see `scripts/publisher-server.ts`).
 */
export type PublishProgress = { stage: string; current?: number; total?: number; detail?: string }
export type ProgressFn = (p: PublishProgress) => void

/** Set for the duration of a run; no-op for the CLI path. */
let emit: ProgressFn = () => {}

function log(msg: string) {
  console.log(`\n\x1b[36m[publish]\x1b[0m ${msg}`)
}

/** Fail fast if the publish port is taken (we'd crawl the wrong server). */
async function assertPortFree() {
  try {
    await fetch(ORIGIN, { redirect: 'manual' })
  } catch {
    return // nothing listening — good
  }
  throw new Error(`Port ${PORT} is already in use. Stop that process or set PUBLISH_PORT to a free port.`)
}

/** The dev server holds the same SQLite file; concurrent schema push can clash. */
async function warnIfDevServerRunning() {
  try {
    await fetch('http://localhost:3000', { redirect: 'manual' })
    console.warn(
      '\n\x1b[33m[publish]\x1b[0m Something is listening on :3000 — if that is `pnpm dev`, stop it first ' +
        '(both processes open the same SQLite file).',
    )
  } catch {
    // nothing there — fine
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${ORIGIN}/`, { redirect: 'manual' })
      if (res.status > 0) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server did not become ready at ${ORIGIN} within ${timeoutMs}ms`)
}

/** Convert a route path to its file location under dist/. */
function distFileFor(routePath: string): string {
  if (routePath === '/' || routePath === '') return path.join(DIST, 'index.html')
  const clean = routePath.replace(/^\//, '').replace(/\/$/, '')
  // Routes that already name a file (calendar.ics, sitemap.xml, …) stay as-is;
  // everything else becomes a directory with an index.html for clean URLs.
  if (/\.[a-z0-9]+$/i.test(clean)) return path.join(DIST, clean)
  return path.join(DIST, clean, 'index.html')
}

async function saveRoute(routePath: string): Promise<boolean> {
  const res = await fetch(`${ORIGIN}${routePath}`)
  if (!res.ok) {
    console.warn(`  ! ${res.status} ${routePath} (skipped)`)
    return false
  }
  const file = distFileFor(routePath)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, await res.text())
  console.log(`  ✓ ${routePath}`)
  return true
}

type Doc = { slug?: string; legacyId?: number | null }

/** Fetch published docs from a collection. Anonymous → `publicRead` hides drafts. */
async function publishedDocs(collection: string): Promise<Doc[]> {
  const res = await fetch(
    `${ORIGIN}/api/${collection}?limit=2000&depth=0&pagination=false&select[slug]=true&select[legacyId]=true`,
  )
  if (!res.ok) {
    console.warn(`  ! /api/${collection} returned ${res.status}`)
    return []
  }
  const data = (await res.json()) as { docs?: Doc[] }
  return data.docs ?? []
}

async function collectRoutes() {
  const routes = new Set<string>(['/', '/blog', '/events', '/events/archiv', '/events/calendar.ics'])
  const redirects: Array<{ legacyId: number; target: string }> = []

  for (const slug of (await publishedDocs('pages')).map((d) => d.slug)) {
    if (slug) routes.add(slug === 'home' ? '/' : `/${slug}`)
  }

  for (const [collection, base] of [
    ['blog', '/blog'],
    ['events', '/events'],
  ] as const) {
    for (const doc of await publishedDocs(collection)) {
      if (!doc.slug) continue
      const target = `${base}/${doc.slug}`
      routes.add(target)
      // Legacy Joomla article id → new path, mirroring src/lib/legacyRedirects.ts
      // but sourced from the live DB so it can't drift from what's published.
      if (typeof doc.legacyId === 'number') redirects.push({ legacyId: doc.legacyId, target })
    }
  }

  return { routes: [...routes], redirects }
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

/** Recursively list files under a directory, as paths relative to it. */
async function listFiles(dir: string, prefix = ''): Promise<string[]> {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...(await listFiles(path.join(dir, entry.name), rel)))
    else out.push(rel)
  }
  return out
}

/** Percent-decode a URL path, tolerating filenames with a literal `%`. */
function safeDecode(p: string): string {
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}

/** Strip the cache-tag query and undo HTML entity escaping. */
const cleanUrl = (u: string) => safeDecode(u.split('?')[0].replace(/&amp;/g, '&'))

/**
 * Every media URL the snapshotted site actually *fetches*.
 *
 * The distinction matters: a page's inlined RSC payload carries the full media
 * document for every doc it renders, so the original `/api/media/file/x.jpg`
 * appears as **data** for practically every upload even when the browser only
 * ever requests the `@768.webp` variant. Copying on that basis dragged ~50 MB
 * of unreachable originals into the bundle.
 *
 * So originals are collected only from real HTML attributes (`src`, `href`,
 * `content`, `srcset`) — the flight payload escapes its quotes (`\"src\":`) and
 * therefore can't match. Ladder URLs are collected loosely, since they only
 * ever exist because next/image rendered them.
 */
async function collectMediaRefs() {
  const files = (await listFiles(DIST)).filter((f) => f.endsWith('.html'))
  const exact = new Set<string>()
  const ladderBases = new Set<string>()
  const mediaUrl = /\/(?:api\/media\/file|media|diday|brand)\/[^"'\s\\<>)]+/g
  // Case-insensitive: React emits `srcSet=`, hand-written HTML uses `srcset=`.
  const attribute = /(?:src|href|content|srcset)\s*=\s*"([^"]*)"/gi

  for (const file of files) {
    const text = await readFile(path.join(DIST, file), 'utf8')

    // Ladder variants: anywhere in the document.
    for (const match of text.match(mediaUrl) ?? []) {
      const ladder = cleanUrl(match).match(/^(.*)@\d+\.webp$/i)
      if (ladder) ladderBases.add(ladder[1])
    }

    // Originals: only when an attribute actually points at one.
    for (const [, value] of text.matchAll(attribute)) {
      for (const match of value.match(mediaUrl) ?? []) {
        const url = cleanUrl(match)
        if (!/@\d+\.webp$/i.test(url)) exact.add(url)
      }
    }
  }
  return { exact, ladderBases }
}

/** Run `tasks` with a bounded number in flight. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]
      await fn(item)
    }
  })
  await Promise.all(workers)
}

/**
 * Copy referenced media and pre-generate the WebP ladder.
 *
 * `withoutEnlargement` clamps instead of upscaling, but still writes a file at
 * every width — so each name `staticImageLoader` can construct is guaranteed to
 * exist, and the loader needs no manifest. Originals are only copied when
 * something links to them directly (PDFs, rich-text file links); with a custom
 * loader nothing references them as an `<img src>` any more.
 */
async function copyMedia() {
  log('Copying referenced media and generating the WebP ladder')
  const { exact, ladderBases } = await collectMediaRefs()

  type Job = { src: string; prefixes: string[]; base: string }
  const jobs: Job[] = []
  let copied = 0
  const seenBase = new Map<string, string>()

  for (const { dir, prefixes } of MEDIA_SOURCES) {
    for (const rel of await listFiles(dir)) {
      const src = path.join(dir, rel)
      const ext = path.extname(rel)
      const relNoExt = rel.slice(0, rel.length - ext.length)

      // Directly linked (PDF, an <a href> to the original, a plain <img src>).
      const linkedAs = prefixes.map((p) => `${p}/${rel}`).filter((u) => exact.has(u))
      for (const url of linkedAs) {
        const dest = path.join(DIST, url)
        await mkdir(path.dirname(dest), { recursive: true })
        await cp(src, dest)
        copied++
      }

      if (!RASTER_RE.test(rel)) continue
      const wanted = prefixes.filter((p) => ladderBases.has(`${p}/${relNoExt}`))
      if (wanted.length === 0) continue

      // Two sources sharing a basename would resolve to the same ladder name.
      const key = `${wanted[0]}/${relNoExt}`
      const clash = seenBase.get(key)
      if (clash) {
        console.warn(`  ! ${rel} and ${clash} both map to ${key}@<w>.webp — the later one wins`)
      }
      seenBase.set(key, rel)

      jobs.push({ src, prefixes: wanted, base: relNoExt })
    }
  }

  let generated = 0
  let done = 0
  emit({ stage: 'images', current: 0, total: jobs.length })
  await pool(jobs, CONCURRENCY, async (job) => {
    const [primary, ...rest] = job.prefixes
    for (const width of ALL_WIDTHS) {
      const dest = path.join(DIST, primary, `${job.base}@${width}.webp`)
      await mkdir(path.dirname(dest), { recursive: true })
      await sharp(job.src).resize({ width, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toFile(dest)
      generated++
      // The same bytes are served under the other prefix(es).
      for (const prefix of rest) {
        const alias = path.join(DIST, prefix, `${job.base}@${width}.webp`)
        await mkdir(path.dirname(alias), { recursive: true })
        await cp(dest, alias)
      }
    }
    done++
    emit({ stage: 'images', current: done, total: jobs.length })
  })

  console.log(`  ✓ ${generated} WebP variants from ${jobs.length} images, ${copied} originals copied`)
}

async function copyBuildAssets() {
  log('Copying build assets into dist/')

  const nextStatic = path.join(ROOT, '.next', 'static')
  if (existsSync(nextStatic)) {
    await cp(nextStatic, path.join(DIST, '_next', 'static'), { recursive: true })
    console.log('  ✓ .next/static → dist/_next/static')
  }

  // public/, minus the media trees handled by the reference-driven copy.
  const publicDir = path.join(ROOT, 'public')
  for (const entry of await readdir(publicDir, { withFileTypes: true })) {
    if (PUBLIC_SKIP.has(entry.name)) continue
    await cp(path.join(publicDir, entry.name), path.join(DIST, entry.name), { recursive: true })
  }
  console.log('  ✓ public/ → dist/ (media handled separately)')
}

// ---------------------------------------------------------------------------
// Generated files
// ---------------------------------------------------------------------------

async function writeSeoFiles(routes: string[]) {
  log('Writing robots.txt + sitemap.xml')
  const pages = routes.filter((r) => !/\.[a-z0-9]+$/i.test(r)).sort()
  const urls = pages.map((r) => `  <url><loc>${SITE_URL}${r === '/' ? '/' : r}</loc></url>`).join('\n')
  await writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  )
  await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
  console.log(`  ✓ ${pages.length} URLs in sitemap.xml`)
}

type Redirect = { legacyId: number; target: string }

function nginxConf(redirects: Redirect[]): string {
  // Keyed on both query args at once: a single map plus a single `if` is the
  // one `if`-in-location form nginx actually guarantees (`if` + `return`).
  const entries = redirects.map((r) => `    "~^article:${r.legacyId}(:|$)"  ${r.target};`).join('\n')
  return `# GENERATED by scripts/publish-static.ts — do not edit by hand.
#
# Serves the static snapshot in dist/. Clean URLs, the legacy Joomla 301s that
# src/proxy.ts handles on the dynamic app, and cache headers.

# Old Joomla article URLs (/?view=article&id=374:slug) → their new paths.
map "$arg_view:$arg_id" $legacy_target {
    default "";
${entries}
}

server {
    listen       80;
    listen  [::]:80;
    server_name  _;

    root   /usr/share/nginx/html;
    index  index.html;

    # Emit relative Location headers. nginx otherwise rebuilds an absolute URL
    # from $host, which loses the port (and the scheme) behind a proxy or when
    # the container is published on a non-80 port.
    absolute_redirect off;

    location / {
        if ($legacy_target) {
            return 301 $legacy_target;
        }
        # Clean URLs: /blog/foo → /blog/foo/index.html. $uri/index.html is tried
        # before $uri/ so directories serve directly instead of 301-ing to a
        # trailing slash.
        try_files $uri $uri.html $uri/index.html $uri/ =404;
    }

    # Content-hashed build output — safe to cache forever.
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Media + the generated WebP ladder. Payload's cache-tag query busts these
    # when an image is replaced, so a long TTL is safe.
    location ~ ^/(media|api/media/file|diday)/ {
        expires 30d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # The stock mime.types has no .ics entry, so the feed would go out as
    # application/octet-stream and calendar clients would refuse to subscribe.
    # Set it just for this file — a server-level \`types\` block would *replace*
    # the inherited mime map rather than extend it.
    location = /events/calendar.ics {
        default_type text/calendar;
    }

    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # Never serve the SQLite database or dotfiles if one slips into dist.
    location ~ /\\. {
        deny all;
    }
    location ~ \\.db$ {
        deny all;
    }
}
`
}

function htaccess(redirects: Redirect[]): string {
  const rules = redirects
    .map(
      (r) =>
        `RewriteCond %{QUERY_STRING} (^|&)view=article(&|$) [NC]\n` +
        `RewriteCond %{QUERY_STRING} (^|&)id=${r.legacyId}(:|&|$)\n` +
        // Joomla served these from /index.php as well as /, so both must match —
        // `^$` alone would silently miss every real inbound link.
        `RewriteRule ^(index\\.php)?$ ${r.target}? [R=301,L]`,
    )
    .join('\n\n')

  return `# GENERATED by scripts/publish-static.ts — do not edit by hand.

# Never let the content negotiator guess extensions; we do clean URLs ourselves.
Options -MultiViews
DirectoryIndex index.html

# mod_dir would 301 /blog → /blog/ before the rewrite below ever runs, so Apache
# would answer the canonical URLs in sitemap.xml with a redirect while nginx
# serves them directly. -Indexes because disabling DirectorySlash can otherwise
# expose a directory listing.
DirectorySlash Off
Options -Indexes

<IfModule mod_rewrite.c>
  RewriteEngine On

  # Old Joomla article ids (?view=article&id=374:slug) → their new paths.
${rules
  .split('\n')
  .map((l) => (l ? `  ${l}` : l))
  .join('\n')}

  # Clean URLs: /blog/foo → /blog/foo/index.html. The pattern requires at least
  # one character so the bare root never rewrites to "//index.html".
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME}/index.html -f
  RewriteRule ^(.+?)/?$ /$1/index.html [L]
</IfModule>

ErrorDocument 404 /404.html

# Calendar subscription clients refuse anything that isn't text/calendar.
AddType text/calendar .ics

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/png  "access plus 30 days"
</IfModule>

# Content-hashed build output — safe to cache forever.
<IfModule mod_headers.c>
  <FilesMatch "\\.(js|css|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<FilesMatch "\\.db$">
  Require all denied
</FilesMatch>
`
}

async function writeHostConfigs(redirects: Redirect[]) {
  log('Writing host configs (nginx.conf, dist/.htaccess)')
  await writeFile(path.join(ROOT, 'nginx.conf'), nginxConf(redirects))
  await writeFile(path.join(DIST, '.htaccess'), htaccess(redirects))
  console.log(`  ✓ ${redirects.length} legacy redirects in both adapters`)
}

// ---------------------------------------------------------------------------

/**
 * Run the whole snapshot pipeline. Exported so the publisher service can call
 * it in-process (see `scripts/publisher-server.ts`) instead of shelling out.
 *
 * Resolves with the route count; throws on failure.
 */
export async function publishStatic(onProgress?: ProgressFn): Promise<{ ok: number; total: number }> {
  emit = onProgress ?? (() => {})
  await assertPortFree()
  await warnIfDevServerRunning()

  log('Cleaning dist/ and building (STATIC_EXPORT=true)…')
  // Retries: on macOS, Spotlight/Finder can recreate a .DS_Store inside a
  // directory while rm is unlinking it, which surfaces as ENOTEMPTY.
  const wipe = (target: string) => rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  await wipe(DIST)
  await mkdir(DIST, { recursive: true })
  // Drop Next's persisted data cache so nothing is served from a prior build.
  await wipe(path.join(ROOT, '.next', 'cache'))
  // `next`/`pnpm` directly rather than via pnpm when it isn't present — the
  // publisher image installs dependencies but not a package manager.
  emit({ stage: 'build', current: 0, total: 100 })
  await run(PKG_RUN.build, buildEnv(), (line) => {
    const hit = BUILD_MARKERS.find((m) => m.re.test(line))
    if (hit) emit({ stage: 'build', current: Math.round(hit.at * 100), total: 100, detail: hit.label })
  })

  emit({ stage: 'server' })
  log(`Starting production server on ${ORIGIN}…`)
  const [startCmd, ...startArgs] = PKG_RUN.start(PORT)
  const server = spawn(startCmd, startArgs, { env: buildEnv(), cwd: ROOT, stdio: 'inherit' })
  const killServer = () => {
    if (!server.killed) server.kill('SIGTERM')
  }
  process.on('exit', killServer)
  process.on('SIGINT', () => {
    killServer()
    process.exit(1)
  })

  try {
    await waitForServer()

    emit({ stage: 'crawl' })
    log('Crawling published routes → dist/')
    const { routes, redirects } = await collectRoutes()
    let ok = 0
    const failed: string[] = []
    for (const route of routes) {
      if (await saveRoute(route)) ok++
      else failed.push(route)
      emit({ stage: 'crawl', current: ok + failed.length, total: routes.length })
    }

    // A crawl that mostly failed still produces a well-formed dist/ — it is just
    // empty. Publishing that would replace a working site with nothing, so a
    // partial snapshot is a hard failure unless explicitly allowed.
    if (failed.length && process.env.PUBLISH_ALLOW_PARTIAL !== 'true') {
      throw new Error(
        `${failed.length}/${routes.length} routes failed to render — refusing to publish a partial snapshot. ` +
          `First failures: ${failed.slice(0, 5).join(', ')}. ` +
          `(Set PUBLISH_ALLOW_PARTIAL=true to override.)`,
      )
    }

    // Request a definitely-missing path to capture the not-found HTML.
    const notFound = await fetch(`${ORIGIN}/__static_404__`)
    await writeFile(path.join(DIST, '404.html'), await notFound.text())
    console.log('  ✓ /404.html')

    emit({ stage: 'assets' })
    await copyBuildAssets()
    await copyMedia() // must run after the crawl — it reads the emitted HTML
    emit({ stage: 'seo' })
    await writeSeoFiles(routes)
    emit({ stage: 'configs' })
    await writeHostConfigs(redirects)

    log(`Done. Snapshotted ${ok}/${routes.length} routes into dist/`)
    return { ok, total: routes.length }
  } finally {
    killServer()
  }
}

// CLI entry: only when run directly (`pnpm publish:static`), so importing this
// module from the publisher service doesn't kick off a build.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publishStatic().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
