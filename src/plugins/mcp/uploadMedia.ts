import type { PayloadRequest } from 'payload'
import { z } from 'zod'
import { type FetchDeps, fetchPublicFile } from './fetchPublicFile'
import { MAX_UPLOAD_BYTES, safeFileName, sniffType } from './mediaFile'

const parameters = {
  alt: z.string().trim().min(1).describe('Alt text in German: what the image shows (required).'),
  url: z.string().optional().describe('Public https URL of the image or PDF. Give either url or data.'),
  data: z
    .string()
    .optional()
    .describe('The file content, base64-encoded (max 10 MB), e.g. a file you read from disk. Give either url or data.'),
  filename: z.string().optional().describe('Optional file name; the extension is set from the real file type.'),
  aiLabel: z
    .enum(['none', 'generated', 'edited'])
    .default('none')
    .describe(
      'KI label (styleguide): "generated" if an AI made the whole image, "edited" if a real photo was changed with AI. ' +
        'The site draws the label over the image corner; never bake it into the file.',
    ),
}

const Args = z
  .object(parameters)
  .refine((a) => Boolean(a.url) !== Boolean(a.data), { message: 'give exactly one of url or data' })

const decodeBase64 = (data: string): Uint8Array => {
  const clean = data.replace(/^data:[^,]*,/, '').replace(/\s+/g, '')
  if (clean.length > Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 4) throw new Error('the file is larger than 10 MB')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('data is not valid base64')
  return new Uint8Array(Buffer.from(clean, 'base64'))
}

/**
 * `uploadMedia`: Claude adds an image or PDF to the media library, by URL or as
 * base64 content, with the key owner's rights. Uploads are public immediately
 * (media has no drafts) and carry the "Von Claude hochgeladen" marker.
 */
export const makeUploadMediaTool = (fetchDeps: FetchDeps = {}) => ({
  name: 'uploadMedia',
  description:
    'Upload an image (JPEG, PNG, GIF, WebP) or a PDF to the media library, from a public https URL or as base64 content. ' +
    'Returns the media ID to use in a post or event (e.g. cover or image). The file is publicly reachable right away.',
  parameters,
  handler: async (raw: Record<string, unknown>, req: PayloadRequest) => {
    const args = Args.parse(raw)
    const bytes = args.url
      ? await fetchPublicFile(args.url, MAX_UPLOAD_BYTES, fetchDeps)
      : decodeBase64(args.data ?? '')
    if (bytes.length === 0) throw new Error('the file is empty')
    if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('the file is larger than 10 MB')

    const type = sniffType(bytes)
    if (!type) throw new Error('only JPEG, PNG, GIF, WebP and PDF files can be uploaded')
    const wanted = args.filename ?? (args.url ? new URL(args.url).pathname : undefined)
    const name = safeFileName(wanted, type.ext)

    const doc = await req.payload.create({
      collection: 'media',
      data: { alt: args.alt, aiLabel: args.aiLabel } as never,
      file: { data: Buffer.from(bytes), mimetype: type.mimeType, name, size: bytes.length },
      user: req.user,
      overrideAccess: false,
      req,
    })
    const { id, filename, url } = doc as { id: number | string; filename?: string; url?: string }
    return {
      content: [
        {
          type: 'text' as const,
          text: `Uploaded media ${id} (${filename}, ${type.mimeType}). Use this ID in a post or event. URL: ${url}`,
        },
      ],
    }
  },
})
