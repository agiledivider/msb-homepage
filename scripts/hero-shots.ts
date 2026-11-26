/**
 * hero-shots — screenshot the hero at every phone size in headless Chrome (Blink),
 * one shot per hero face, plus one contact sheet per face.
 *
 *   pnpm hero:shots [path] [--base http://localhost:3000] [--out dir]
 *
 * path: default `/` (start page). For one post/event in the hero slot use
 *       `/preview/hero?collection=events&slug=<slug>&bare=1`.
 *
 * Also fails (exit 1) when any size scrolls sideways, which phones let you do
 * as soon as anything is wider than the viewport.
 *
 * Why: the phone hero took ~25 screenshot rounds with Falk on 2026-11-22.
 * Render every size first and look at them yourself before showing Falk.
 * WebKit flattens the prism, so this uses Chrome (CLAUDE.md, Browser checks).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'
import { PHONES } from '../src/lib/phoneSizes'

const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const FLIP_SETTLE_MS = 1600 // prism flip incl. anticipation + overshoot
const LOAD_TIMEOUT_MS = 30_000

const args = process.argv.slice(2)
const opt = (name: string) => {
  const i = args.indexOf(name)
  if (i < 0) return undefined
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const base = opt('--base') ?? 'http://localhost:3000'
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = opt('--out') ?? path.join(tmpdir(), 'msb-hero-shots', stamp)
const target = new URL(args[0] ?? '/', base).toString()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Minimal CDP client over the browser websocket, one flattened page session. */
async function launch() {
  const profile = mkdtempSync(path.join(tmpdir(), 'msb-hero-chrome-'))
  const proc = spawn(
    CHROME,
    ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const wsUrl = await new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Chrome did not start (set CHROME_BIN?)')), 15_000)
    proc.stderr.on('data', (d: Buffer) => {
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(d.toString())
      if (m) {
        clearTimeout(t)
        resolve(m[1])
      }
    })
    proc.on('error', reject)
  })
  const ws = new WebSocket(wsUrl)
  await new Promise((r, j) => {
    ws.onopen = r
    ws.onerror = j
  })
  let id = 0
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  const listeners: Array<(method: string) => void> = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data)) as {
      id?: number
      result?: unknown
      error?: { message: string }
      method?: string
    }
    if (msg.id !== undefined) {
      const p = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) p?.reject(new Error(msg.error.message))
      else p?.resolve(msg.result)
    } else if (msg.method) for (const l of listeners) l(msg.method)
  }
  let sessionId: string | undefined
  const send = <T = Record<string, unknown>>(method: string, params: object = {}) =>
    new Promise<T>((resolve, reject) => {
      const n = ++id
      pending.set(n, { resolve: resolve as (v: unknown) => void, reject })
      ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  const waitFor = (method: string, ms: number) =>
    new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), ms)
      listeners.push((m) => {
        if (m === method) {
          clearTimeout(t)
          resolve()
        }
      })
    })

  const { targetId } = await send<{ targetId: string }>('Target.createTarget', { url: 'about:blank' })
  sessionId = (await send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })).sessionId
  await send('Page.enable')
  const evaluate = async <T>(expression: string) =>
    (
      await send<{ result: { value: T } }>('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
    ).result.value
  const close = async () => {
    ws.close()
    const exited = new Promise((r) => proc.once('exit', r))
    proc.kill()
    await exited
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  return { send, waitFor, evaluate, close }
}

// The hero's slide pills and its pause button (src/blocks/Hero/Component.tsx).
const PILL = 'button[aria-current]'
const PAUSE = 'button[aria-pressed][aria-label^="Automatisches Wechseln"]'
const SHOW_TIMEOUT_MS = 20_000

type Cdp = Awaited<ReturnType<typeof launch>>

const isCurrent = (cdp: Cdp, face: number) =>
  cdp.evaluate<boolean>(`document.querySelectorAll('${PILL}')[${face}]?.getAttribute('aria-current') === 'true'`)

/**
 * Bring `face` to the front with the auto-flip paused. Clicks before React has
 * hydrated do nothing (the load event fires earlier in dev), so this retries
 * until the pill reports itself current, and fails loudly instead of
 * photographing whatever face happens to be showing.
 */
async function showFace(cdp: Cdp, face: number, phone: string) {
  const until = Date.now() + SHOW_TIMEOUT_MS
  while (Date.now() < until) {
    await cdp.evaluate(`(() => {
      const pause = document.querySelector('${PAUSE}');
      if (pause?.getAttribute('aria-pressed') === 'false') pause.click();
      document.querySelectorAll('${PILL}')[${face}]?.click();
    })()`)
    await sleep(400)
    const paused = await cdp.evaluate<boolean>(
      `document.querySelector('${PAUSE}')?.getAttribute('aria-pressed') === 'true'`,
    )
    if (paused && (await isCurrent(cdp, face))) return
  }
  throw new Error(`${phone}: could not show face ${face + 1} within ${SHOW_TIMEOUT_MS / 1000}s`)
}

type Shot = { phone: (typeof PHONES)[number]; face: number; file: string; overflow: number }

async function main() {
  mkdirSync(outDir, { recursive: true })
  const cdp = await launch()
  const shots: Shot[] = []
  try {
    for (const phone of PHONES) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: phone.w,
        height: phone.h,
        deviceScaleFactor: 2,
        mobile: true,
      })
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true })
      const loaded = cdp.waitFor('Page.loadEventFired', LOAD_TIMEOUT_MS)
      await cdp.send('Page.navigate', { url: target })
      await loaded
      await cdp.evaluate('document.fonts.ready.then(() => true)')
      await cdp.evaluate(`document.querySelector('nextjs-portal')?.remove()`) // dev badge covers the pause button
      const faces = await cdp.evaluate<number>(`document.querySelectorAll('${PILL}').length`)
      if (!faces) throw new Error(`${phone.name}: no hero on ${target}`)
      // stop the auto-flip so every shot shows a settled face (after hydration, see showFace)
      for (let face = 0; face < faces; face++) {
        await showFace(cdp, face, phone.name)
        await sleep(FLIP_SETTLE_MS)
        if (!(await isCurrent(cdp, face)))
          throw new Error(`${phone.name}: face ${face + 1} flipped away before the shot`)
        const overflow = await cdp.evaluate<number>(
          'Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth',
        )
        const { data } = await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png' })
        const file = path.join(outDir, `face${face + 1}-${slug(phone.name)}-${phone.w}x${phone.h}.png`)
        writeFileSync(file, Buffer.from(data, 'base64'))
        shots.push({ phone, face, file, overflow })
      }
    }
  } finally {
    await cdp.close()
  }

  // one contact sheet per face: all sizes side by side at CSS-px scale, labelled
  const GAP = 24
  const LABEL = 36
  const sheets: string[] = []
  for (const face of [...new Set(shots.map((s) => s.face))]) {
    const row = shots.filter((s) => s.face === face)
    const width = row.reduce((w, s) => w + s.phone.w + GAP, GAP)
    const height = Math.max(...row.map((s) => s.phone.h)) + LABEL + GAP
    let x = GAP
    const layers: OverlayOptions[] = []
    for (const s of row) {
      const label = `${s.phone.name} ${s.phone.w}×${s.phone.h}${s.overflow > 0 ? ` · ${s.overflow}px SIDEWAYS` : ''}`
      const color = s.overflow > 0 ? '#c0392b' : '#333'
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.phone.w}" height="${LABEL}"><text x="0" y="24" font-family="Helvetica" font-size="14" fill="${color}">${label}</text></svg>`
      layers.push({ input: Buffer.from(svg), left: x, top: 0 })
      layers.push({ input: await sharp(s.file).resize(s.phone.w).toBuffer(), left: x, top: LABEL })
      x += s.phone.w + GAP
    }
    const file = path.join(outDir, `sheet-face${face + 1}.png`)
    await sharp({ create: { width, height, channels: 3, background: '#e8e8e8' } })
      .composite(layers)
      .png()
      .toFile(file)
    sheets.push(file)
  }

  console.log(`hero shots of ${target}`)
  console.log(`  ${shots.length} shots in ${outDir}`)
  for (const s of sheets) console.log(`  sheet: ${s}`)
  const wide = shots.filter((s) => s.overflow > 0)
  for (const s of wide)
    console.log(`  SIDEWAYS SCROLL: ${s.phone.name} face ${s.face + 1}: ${s.overflow}px wider than the screen`)
  if (wide.length) process.exit(1)
}

await main()
