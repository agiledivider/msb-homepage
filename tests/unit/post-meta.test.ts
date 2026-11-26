import { describe, expect, it } from 'vitest'
import { authorName } from '@/collections/Blog'
import { postDate, postMeta } from '@/lib/postMeta'

describe('postDate', () => {
  it.each([
    ['2017-08-22T20:50:14.000Z', '22. August 2017'],
    // 23:30 UTC on 31 Dec is already New Year in Berlin
    ['2025-12-31T23:30:00.000Z', '1. Januar 2026'],
    // summer time: 22:30 UTC = 00:30 CEST next day
    ['2026-06-30T22:30:00.000Z', '1. Juli 2026'],
  ])('%s → %s', (iso, expected) => {
    expect(postDate(iso)).toBe(expected)
  })

  it.each([[null], [undefined], [''], ['kein Datum']])('%s → null', (v) => {
    expect(postDate(v)).toBeNull()
  })
})

describe('postMeta', () => {
  const post = { publishedAt: '2017-08-22T20:50:14.000Z', author: 'Heribert', readingTime: '6 MIN' }

  it.each([
    ['everything', post, '22. August 2017 · Heribert · 6 MIN'],
    ['no author (old post)', { ...post, author: null }, '22. August 2017 · 6 MIN'],
    ['blank author', { ...post, author: '  ' }, '22. August 2017 · 6 MIN'],
    ['no date', { ...post, publishedAt: null }, 'Heribert · 6 MIN'],
    ['nothing', {}, ''],
  ])('%s', (_n, p, expected) => {
    expect(postMeta(p)).toBe(expected)
  })

  it('leaves out the reading time on list cards', () => {
    expect(postMeta(post, { readingTime: false })).toBe('22. August 2017 · Heribert')
  })
})

describe('authorName (default author of a new post)', () => {
  it.each([
    ['a CMS user', { id: 1, name: ' Erika Editor ' }, 'Erika Editor'],
    [
      'a Claude API key with its owner loaded',
      { id: 9, label: 'Claude', user: { id: 1, name: 'Erika Editor' } },
      'Erika Editor',
    ],
    ['a Claude API key with only the owner id', { id: 9, user: 1 }, undefined],
    ['a user without a name', { id: 1, name: '' }, undefined],
    ['nobody', null, undefined],
  ])('%s', (_n, user, expected) => {
    expect(authorName(user)).toBe(expected)
  })
})
