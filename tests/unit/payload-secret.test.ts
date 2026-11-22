/** The app refuses to start without a real PAYLOAD_SECRET instead of running with an empty one. */
import { describe, expect, it } from 'vitest'
import { payloadSecret } from '@/lib/payloadSecret'

describe('payloadSecret', () => {
  it('returns a set secret', () => {
    expect(payloadSecret({ PAYLOAD_SECRET: ' 3f9a…long ' })).toBe('3f9a…long')
  })

  it.each([
    ['missing', {}],
    ['empty', { PAYLOAD_SECRET: '' }],
    ['only spaces', { PAYLOAD_SECRET: '   ' }],
  ])('refuses a %s secret', (_label, env) => {
    expect(() => payloadSecret(env)).toThrow(/PAYLOAD_SECRET is not set/)
  })

  it('refuses the example value in production', () => {
    expect(() =>
      payloadSecret({ NODE_ENV: 'production', PAYLOAD_SECRET: 'change-me-to-a-long-random-string' }),
    ).toThrow(/example value/)
  })

  it('allows the example value in development', () => {
    expect(payloadSecret({ NODE_ENV: 'development', PAYLOAD_SECRET: 'change-me-to-a-long-random-string' })).toBe(
      'change-me-to-a-long-random-string',
    )
  })
})
