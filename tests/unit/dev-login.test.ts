/** The one-click dev logins exist only in development with a password set. */
import { describe, expect, it } from 'vitest'
import { devLoginEnabled, isDevAccount } from '@/lib/devLogin'

describe('dev login', () => {
  it.each([
    [{ NODE_ENV: 'development', DEV_USER_PASSWORD: 'x' }, true],
    [{ NODE_ENV: 'development' }, false],
    [{ NODE_ENV: 'production', DEV_USER_PASSWORD: 'x' }, false],
    [{ NODE_ENV: 'test', DEV_USER_PASSWORD: 'x' }, false],
    [{ DEV_USER_PASSWORD: 'x' }, false],
  ])('%o → %s', (env, expected) => {
    expect(devLoginEnabled(env)).toBe(expected)
  })

  it('knows only the two test accounts', () => {
    expect(['editor', 'reviewer'].every(isDevAccount)).toBe(true)
    expect(isDevAccount('admin')).toBe(false)
    expect(isDevAccount('constructor')).toBe(false)
  })
})
