/**
 * media-upload — put a local image or PDF into the CMS media library.
 *
 *   pnpm media:upload <file> --alt "Was zu sehen ist" [--ai generated|edited] [--max 1600]
 *
 * Shrinks images to at most --max px on the long side (EXIF rotation applied,
 * metadata dropped), then calls the CMS's own `uploadMedia` MCP tool, so the
 * upload takes the same path as Claude's: same checks, same user, and content
 * reaches the server only through the CMS (D-011). PDFs go up unchanged.
 * Prints the media ID to use as a cover or image.
 *
 * Why a script: through the chat a file travels as base64 inside a tool call,
 * which is impractical beyond a few kilobytes. Since 2026-11-26.
 *
 * Needs in `.env`: MSB_MCP_URL (`https://<CMS address>/api/mcp`) and
 * MSB_MCP_KEY (an MCP key from the CMS, docs/CLAUDE-MCP.md).
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'
import { z } from 'zod'

const MAX_BYTES = 10 * 1024 * 1024 // the server's limit for one upload
const TIMEOUT_MS = 60_000

const AiLabel = z.enum(['none', 'generated', 'edited'])

const EnvSchema = z.object({
  MSB_MCP_URL: z.string().url({ message: 'MSB_MCP_URL must be the CMS MCP address, https://<CMS address>/api/mcp' }),
  MSB_MCP_KEY: z.string().min(1, { message: 'MSB_MCP_KEY is missing (an MCP key from the CMS)' }),
})
export type Env = z.infer<typeof EnvSchema>

/** Parsed env, or every problem at once. */
export function parseEnv(env: Record<string, string | undefined>): Env {
  const res = EnvSchema.safeParse(env)
  if (res.success) return res.data
  throw new Error(res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'))
}

export type Options = { file: string; alt: string; ai: z.infer<typeof AiLabel>; max: number }

export function parseCli(argv: string[]): Options {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      alt: { type: 'string' },
      ai: { type: 'string', default: 'none' },
      max: { type: 'string', default: '1600' },
    },
  })
  const problems: string[] = []
  if (positionals.length !== 1) problems.push('give exactly one file')
  if (!values.alt?.trim()) problems.push('--alt is required: what the image shows, in German')
  const ai = AiLabel.safeParse(values.ai)
  if (!ai.success) problems.push('--ai must be generated or edited')
  const max = Number(values.max)
  if (!Number.isInteger(max) || max < 200) problems.push('--max must be a whole number of pixels, at least 200')
  if (problems.length) throw new Error(problems.join('\n'))
  return { file: positionals[0], alt: (values.alt ?? '').trim(), ai: ai.success ? ai.data : 'none', max }
}

export type Prepared = { data: Buffer; filename: string }

/** Images: fit within `max` px, JPEG (WebP when the image has transparency). PDFs: unchanged. */
export async function prepareFile(bytes: Buffer, name: string, max: number): Promise<Prepared> {
  const base = path.parse(name).name
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return { data: bytes, filename: `${base}.pdf` }
  const img = sharp(bytes).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
  const { hasAlpha } = await sharp(bytes).metadata()
  return hasAlpha
    ? { data: await img.webp({ quality: 85 }).toBuffer(), filename: `${base}.webp` }
    : { data: await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer(), filename: `${base}.jpg` }
}

const RpcResponse = z.object({
  result: z
    .object({
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
      isError: z.boolean().optional(),
    })
    .optional(),
  error: z.object({ message: z.string() }).optional(),
})

/** The JSON-RPC message from a plain JSON or a server-sent-events body. */
function parseRpcBody(body: string): z.infer<typeof RpcResponse> {
  const json = body.trimStart().startsWith('{')
    ? body
    : body
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .at(-1)
  if (!json) throw new Error('the CMS sent an empty answer')
  return RpcResponse.parse(JSON.parse(json))
}

export type Upload = { mediaId: number; message: string }

/** Calls the CMS's uploadMedia tool over MCP (streamable HTTP). */
export async function uploadViaMcp(
  env: Env,
  file: Prepared,
  meta: { alt: string; ai: Options['ai'] },
  fetchFn: typeof fetch = fetch,
): Promise<Upload> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${env.MSB_MCP_KEY}`,
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  }
  const rpc = async (id: number, method: string, params: unknown) => {
    const res = await fetchFn(env.MSB_MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`CMS answered ${res.status} to ${method}`)
    return { session: res.headers.get('mcp-session-id'), msg: parseRpcBody(await res.text()) }
  }

  const init = await rpc(1, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'msb-media-upload', version: '1' },
  })
  if (init.session) headers['mcp-session-id'] = init.session

  const { msg } = await rpc(2, 'tools/call', {
    name: 'uploadMedia',
    arguments: { data: file.data.toString('base64'), filename: file.filename, alt: meta.alt, aiLabel: meta.ai },
  })
  if (msg.error) throw new Error(`CMS refused the upload: ${msg.error.message}`)
  const text = (msg.result?.content ?? []).map((c) => c.text ?? '').join('\n')
  if (msg.result?.isError) throw new Error(`CMS refused the upload: ${text}`)
  const id = /Uploaded media (\d+)/.exec(text)?.[1]
  if (!id) throw new Error(`unexpected answer from the CMS: ${text}`)
  return { mediaId: Number(id), message: text }
}

async function main() {
  try {
    process.loadEnvFile('.env')
  } catch {
    // no .env: the environment may already carry the values
  }
  const opts = parseCli(process.argv.slice(2))
  const env = parseEnv(process.env)
  const prepared = await prepareFile(await readFile(opts.file), opts.file, opts.max)
  if (prepared.data.length > MAX_BYTES) {
    throw new Error(
      `${prepared.filename} is ${(prepared.data.length / 1e6).toFixed(1)} MB after resizing; the CMS takes 10 MB`,
    )
  }
  const { mediaId } = await uploadViaMcp(env, prepared, opts)
  console.log(`media ${mediaId}: ${prepared.filename} (${Math.round(prepared.data.length / 1024)} KB)`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
