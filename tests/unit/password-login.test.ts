/** PASSWORD_LOGIN decides whether email/password login exists; servers default to Kanidm only. */
import { describe, expect, it } from 'vitest'
import { passwordLoginEnabled } from '@/lib/passwordLogin'

describe('passwordLoginEnabled', () => {
  it.each([
    ['production without the setting', { NODE_ENV: 'production' }, false],
    ['development without the setting', { NODE_ENV: 'development' }, true],
    ['tests without the setting', { NODE_ENV: 'test' }, true],
    ['"on" in production (emergency access)', { NODE_ENV: 'production', PASSWORD_LOGIN: 'on' }, true],
    ['"off" in development', { NODE_ENV: 'development', PASSWORD_LOGIN: 'off' }, false],
    ['"OFF " with case and space', { NODE_ENV: 'development', PASSWORD_LOGIN: 'OFF ' }, false],
  ])('%s → %s', (_label, env, enabled) => {
    expect(passwordLoginEnabled(env)).toBe(enabled)
  })

  it.each([['yes'], ['true'], ['1']])('refuses "%s" instead of guessing', (value) => {
    expect(() => passwordLoginEnabled({ PASSWORD_LOGIN: value })).toThrow(/must be "on" or "off"/)
  })
})
