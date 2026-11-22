import { describe, expect, it } from 'vitest'
import { parseSpaceApi, stateLabels } from '@/lib/spaceState'

describe('parseSpaceApi', () => {
  it.each([
    [
      'closed (real response shape, 2026-11-22)',
      { space: 'MakerSpace Bonn e.V.', state: { open: false, lastchange: 1795300205 } },
      { open: false },
    ],
    ['open until', { state: { open: true, openUntil: '21:00' } }, { open: true, openUntil: '21:00' }],
    ['open, no end', { state: { open: true } }, { open: true }],
  ])('%s', (_name, body, expected) => {
    expect(parseSpaceApi(body)).toEqual(expected)
  })

  it.each([
    ['no state', { space: 'x' }],
    ['open is a string', { state: { open: 'yes' } }],
    ['empty openUntil', { state: { open: true, openUntil: '' } }],
    ['not an object', 'Bad Gateway'],
    ['null', null],
  ])('rejects %s', (_name, body) => {
    expect(parseSpaceApi(body)).toBeNull()
  })
})

describe('stateLabels', () => {
  it.each([
    [{ open: false }, 'Geschlossen'],
    [{ open: true }, 'Für Mitglieder geöffnet'],
    [{ open: true, openUntil: '21:00' }, 'Für Mitglieder bis 21:00 geöffnet.'],
  ])('%j → %s', (state, short) => {
    expect(stateLabels(state).short).toBe(short)
  })
})
