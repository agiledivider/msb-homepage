import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

/**
 * Signed, short-lived preview links for exactly one draft (blog post or event).
 *
 * Claude can't log in to the CMS, so the MCP tool `previewLink` hands out a URL
 * carrying this token. Unlike /next/preview it never enables Next draft mode
 * (that cookie would show *every* draft); the token page loads only the one
 * document named in the token. Pure: secret and clock are passed in.
 */

export const PREVIEW_COLLECTIONS = ['blog', 'events'] as const
export type PreviewCollection = (typeof PREVIEW_COLLECTIONS)[number]
export type PreviewTarget = { collection: PreviewCollection; id: number }

export const PREVIEW_TTL_MS = 15 * 60 * 1000

const Payload = z.object({
  c: z.enum(PREVIEW_COLLECTIONS),
  i: z.number().int().positive(),
  e: z.number().int().positive(), // expiry, unix ms
})

/** A key used only for preview links, derived from the Payload secret. */
const linkKey = (secret: string) => {
  if (!secret) throw new Error('preview links need a secret')
  return createHmac('sha256', secret).update('msb-preview-link:v1').digest()
}

const sign = (body: string, secret: string) => createHmac('sha256', linkKey(secret)).update(body).digest('base64url')

export function signPreviewToken(target: PreviewTarget, secret: string, now: Date, ttlMs = PREVIEW_TTL_MS): string {
  const body = Buffer.from(
    JSON.stringify({ c: target.collection, i: target.id, e: now.getTime() + ttlMs } satisfies z.infer<typeof Payload>),
  ).toString('base64url')
  return `${body}.${sign(body, secret)}`
}

/** The target if the token is genuine and not expired, otherwise undefined. */
export function verifyPreviewToken(token: string, secret: string, now: Date): PreviewTarget | undefined {
  const [body, sig, ...rest] = token.split('.')
  if (!body || !sig || rest.length > 0) return undefined

  const expected = Buffer.from(sign(body, secret))
  const given = Buffer.from(sig)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined

  let json: unknown
  try {
    json = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
  const parsed = Payload.safeParse(json)
  if (!parsed.success || parsed.data.e <= now.getTime()) return undefined
  return { collection: parsed.data.c, id: parsed.data.i }
}
