/**
 * One-click logins on the admin login page, development only: "Redakteur" and
 * "Reviewer" log in as the reserved test accounts (`pnpm dev:users`). The
 * password stays on the server (DEV_USER_PASSWORD); the endpoint and the
 * buttons don't exist in any other environment.
 */
export const DEV_ACCOUNTS = {
  editor: { email: 'editor@test.de', label: 'Als Redakteur' },
  reviewer: { email: 'reviewer@test.de', label: 'Als Reviewer' },
} as const
export type DevAccount = keyof typeof DEV_ACCOUNTS

export const devLoginEnabled = (env: Record<string, string | undefined>): boolean =>
  env.NODE_ENV === 'development' && Boolean(env.DEV_USER_PASSWORD)

export const isDevAccount = (v: unknown): v is DevAccount => typeof v === 'string' && Object.hasOwn(DEV_ACCOUNTS, v)
