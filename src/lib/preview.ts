/** Base URL used by live preview (iframe origin check + absolute links). */
export const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/**
 * Build the URL for both the admin "Preview" button (draft preview) and the
 * live-preview iframe. It points at the /next/preview route, which enables
 * Next.js Draft Mode (auth-checked) and redirects to `path`.
 */
export const generatePreviewPath = ({ path }: { path: string }) => {
  const params = new URLSearchParams({ path })
  return `/next/preview?${params.toString()}`
}
