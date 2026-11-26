import { z } from 'zod'

/**
 * External sign-up address of an event (S5.19), e.g. the Teckids Campdays on
 * teckids.org. Only https addresses count; anything else is treated as "no
 * sign-up address" on the site and rejected in the CMS.
 */
export const SignupUrlSchema = z.string().trim().url().startsWith('https://')

export type Signup = { url: string; host: string }

/** The sign-up address and its readable host ("teckids.org"), or undefined. */
export function eventSignup(raw: string | null | undefined): Signup | undefined {
  const parsed = SignupUrlSchema.safeParse(raw)
  if (!parsed.success) return undefined
  return { url: parsed.data, host: new URL(parsed.data).hostname.replace(/^www\./, '') }
}

/** Payload field validator: empty is fine, otherwise a full https address. */
export function validateSignupUrl(value: string | null | undefined): true | string {
  if (!value?.trim()) return true
  return SignupUrlSchema.safeParse(value).success
    ? true
    : 'Bitte eine vollständige Adresse mit https:// eingeben, z. B. https://teckids.org/anmeldung'
}
