/**
 * Calls to Kanidm (S2.4): they give up after a few seconds instead of hanging
 * the login request, and their failures are logged without the provider's
 * response body (it can echo codes or tokens).
 */
export const KANIDM_TIMEOUT_MS = 5_000

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export const kanidmFetch = (
  url: string,
  init: RequestInit = {},
  { fetchImpl = fetch as FetchLike, timeoutMs = KANIDM_TIMEOUT_MS } = {},
): Promise<Response> => fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })

/** "Kanidm token exchange failed (400 invalid_grant)": status + OAuth error code only. */
export function providerError(what: string, status: number, body: unknown): Error {
  const code =
    body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error.replace(/[^\w.-]/g, '').slice(0, 64)
      : ''
  return new Error(`${what} failed (${status}${code ? ` ${code}` : ''})`)
}
