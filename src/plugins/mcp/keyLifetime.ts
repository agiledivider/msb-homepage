import type { Field } from 'payload'

/**
 * S2.6: an AI key can be given an end date, and the CMS shows when each key
 * was last used. Checked and stamped in the MCP plugin's `overrideAuth`.
 */
export type KeyLifetime = { expiresAt?: string | null; lastUsedAt?: string | null }

/** Refresh "last used" at most this often, so every MCP call isn't a write. */
export const LAST_USED_RESOLUTION_MS = 10 * 60_000

/** False once the key's end date has passed. */
export const keyIsValid = (key: KeyLifetime, now: Date): boolean =>
  !key.expiresAt || new Date(key.expiresAt).getTime() > now.getTime()

/** True when "last used" is missing or older than the resolution. */
export const shouldStampLastUsed = (key: KeyLifetime, now: Date): boolean =>
  !key.lastUsedAt || now.getTime() - new Date(key.lastUsedAt).getTime() >= LAST_USED_RESOLUTION_MS

export const keyLifetimeFields: Field[] = [
  {
    name: 'expiresAt',
    type: 'date',
    label: 'Gültig bis',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime' },
      description: 'Danach funktioniert der Schlüssel nicht mehr. Leer lassen: unbegrenzt.',
    },
  },
  {
    name: 'lastUsedAt',
    type: 'date',
    label: 'Zuletzt benutzt',
    admin: {
      position: 'sidebar',
      readOnly: true,
      date: { pickerAppearance: 'dayAndTime' },
      description: 'Auf etwa 10 Minuten genau.',
    },
  },
]
