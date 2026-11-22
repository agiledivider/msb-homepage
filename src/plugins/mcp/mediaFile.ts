/**
 * What Claude may upload: the real type comes from the file's first bytes, never
 * from a name, URL or claimed MIME type. SVG is excluded on purpose: it is
 * served from the CMS's own origin and can carry script.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export type SniffedType = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'
  ext: string
}

const startsWith = (buf: Uint8Array, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b)

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

/** The file's type from its magic bytes, or null when it isn't one we accept. */
export const sniffType = (buf: Uint8Array): SniffedType | null => {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mimeType: 'image/jpeg', ext: 'jpg' }
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mimeType: 'image/png', ext: 'png' }
  if (startsWith(buf, ascii('GIF87a')) || startsWith(buf, ascii('GIF89a'))) return { mimeType: 'image/gif', ext: 'gif' }
  if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8))
    return { mimeType: 'image/webp', ext: 'webp' }
  if (startsWith(buf, ascii('%PDF-'))) return { mimeType: 'application/pdf', ext: 'pdf' }
  return null
}

/** A safe file name ending in the sniffed extension: `../Mein Foto.PNG` → `mein-foto.png`. */
export const safeFileName = (wanted: string | undefined, ext: string): string => {
  const base = (wanted ?? '').split(/[\\/]/).pop() ?? ''
  const stem = base
    .replace(/\.[^.]*$/, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${stem || 'claude-upload'}.${ext}`
}
