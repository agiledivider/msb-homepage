/**
 * True for a path on this site that is safe to redirect to: it starts with one
 * "/" and stays on the same origin. Rejects protocol-relative URLs
 * (`//evil.example`), backslash tricks browsers turn into them (`/\evil`),
 * control characters and anything with a scheme (S2.4).
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path?.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false
  if ([...path].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return false
  const base = 'http://site.invalid'
  try {
    return new URL(path, base).origin === base
  } catch {
    return false
  }
}
