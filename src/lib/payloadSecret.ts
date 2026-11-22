/**
 * PAYLOAD_SECRET, checked at startup. It signs logins and preview links and
 * keys the Claude/MCP API key lookup, so it must be set, and in production it
 * must not be the example value from `.env.*.example`. It is not in any backup:
 * keep it in the password manager (DEPLOY.md, "Moving to a new server").
 */
const EXAMPLE_VALUE = 'change-me-to-a-long-random-string'

export function payloadSecret(env: Record<string, string | undefined>): string {
  const secret = env.PAYLOAD_SECRET?.trim()
  if (!secret) {
    throw new Error('PAYLOAD_SECRET is not set. Generate one with `openssl rand -hex 32` and put it in .env.')
  }
  if (env.NODE_ENV === 'production' && secret === EXAMPLE_VALUE) {
    throw new Error(
      'PAYLOAD_SECRET is still the example value from .env.*.example. Generate one with `openssl rand -hex 32`.',
    )
  }
  return secret
}
