/**
 * S5.11: what a page view counts as, where a visit came from, which day it
 * belongs to, and which period the Statistik view shows. Pure rules, no DB.
 */
import { describe, expect, it } from 'vitest'
import { optedOut } from '@/components/StatsBeacon'
import { berlinDay, classifySource, isBot, normalizePath, parseHit } from '@/lib/stats/hit'
import { addDays, daysBetween, pageKind, parsePeriod } from '@/plugins/stats/load'

const NOW = new Date('2026-11-26T12:00:00Z')

describe('normalizePath', () => {
  it.each([
    ['/', '/'],
    ['/blog/mein-post', '/blog/mein-post'],
    ['/blog/mein-post/', '/blog/mein-post'],
    ['/suche?q=lasercutter+anna', '/suche'], // search terms never stored
    ['/events#mai', '/events'],
    ['/admin', null],
    ['/admin/collections/blog', null],
    ['/api/stats/hit', null],
    ['/preview/hero', null],
    ['/_next/static/x.js', null],
    ['/next/preview', null],
    ['/administration', '/administration'], // only the exact prefix is the CMS
    ['https://evil.example/x', null],
    ['//evil.example/x', null],
    ['relative', null],
    ['/ümlaut', null],
    [`/${'a'.repeat(250)}`, null],
  ])('%s → %s', (raw, expected) => {
    expect(normalizePath(raw)).toBe(expected)
  })
})

describe('classifySource', () => {
  it.each([
    [undefined, 'direct', 'direkt'],
    ['', 'direct', 'direkt'],
    ['not a url', 'direct', 'direkt'],
    ['javascript:alert(1)', 'direct', 'direkt'],
    ['https://www.google.de/', 'search', 'google.de'],
    ['https://www.google.com/search?q=makerspace+bonn', 'search', 'google.com'],
    ['https://www.google.co.uk/', 'search', 'google.co.uk'],
    ['https://duckduckgo.com/', 'search', 'duckduckgo.com'],
    ['https://www.ecosia.org/search?q=x', 'search', 'ecosia.org'],
    ['https://search.brave.com/', 'search', 'search.brave.com'],
    ['https://www.bing.com/', 'search', 'bing.com'],
    ['android-app://com.google.android.googlequicksearchbox/', 'search', 'com.google.android.googlequicksearchbox'],
    ['https://l.facebook.com/l.php?u=x', 'social', 'facebook.com'],
    ['https://lm.facebook.com/', 'social', 'facebook.com'],
    ['https://m.facebook.com/', 'social', 'facebook.com'],
    ['https://www.instagram.com/', 'social', 'instagram.com'],
    ['https://t.co/abc', 'social', 't.co'],
    ['https://www.linkedin.com/', 'social', 'linkedin.com'],
    ['https://chaos.social/@msb', 'social', 'chaos.social'],
    ['https://bsky.app/profile/x', 'social', 'bsky.app'],
    ['https://www.bonn.de/vereine/', 'site', 'bonn.de'],
    ['https://WWW.General-Anzeiger-Bonn.DE/artikel', 'site', 'general-anzeiger-bonn.de'],
    ['https://notgoogle.example/', 'site', 'notgoogle.example'],
    ['https://google.evil.example/', 'site', 'google.evil.example'],
  ])('%s → %s %s', (referrer, kind, source) => {
    expect(classifySource(referrer)).toEqual({ kind, source })
  })

  it('keeps only the host, never path or query', () => {
    const s = classifySource('https://www.google.de/search?q=anna+mueller+bonn')
    expect(JSON.stringify(s)).not.toMatch(/anna|search\?/)
  })
})

describe('isBot', () => {
  it.each([
    [null, true],
    ['', true],
    ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', true],
    ['Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0', true],
    ['curl/8.4.0', true],
    ['facebookexternalhit/1.1', true],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', false],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36', false],
  ])('%s → %s', (ua, bot) => {
    expect(isBot(ua)).toBe(bot)
  })
})

describe('berlinDay', () => {
  it.each([
    ['2026-11-26T22:59:59Z', '2026-11-26'], // 23:59:59 CET
    ['2026-11-26T23:00:00Z', '2026-11-27'], // midnight CET
    ['2026-03-29T21:59:59Z', '2026-03-29'], // 23:59:59 CEST, the night clocks went forward
    ['2026-03-29T22:00:00Z', '2026-03-30'],
    ['2026-10-25T22:59:59Z', '2026-10-25'], // after clocks went back: CET again
    ['2026-10-25T23:00:00Z', '2026-10-26'],
  ])('%s → %s', (iso, day) => {
    expect(berlinDay(new Date(iso))).toBe(day)
  })
})

describe('parseHit', () => {
  const host = 'makerspacebonn.de'

  it('a first page from a search is a visit with its source', () => {
    expect(parseHit({ p: '/blog/x', r: 'https://www.google.de/' }, host, NOW)).toEqual({
      day: '2026-11-26',
      path: '/blog/x',
      visit: true,
      source: { kind: 'search', source: 'google.de' },
    })
  })

  it('a typed address (no referrer) is a direct visit', () => {
    expect(parseHit({ p: '/' }, host, NOW)).toMatchObject({ visit: true, source: { kind: 'direct' } })
  })

  it('a page reached from inside the site is a view, not a visit', () => {
    expect(parseHit({ p: '/events', r: 'https://www.makerspacebonn.de/' }, host, NOW)).toEqual({
      day: '2026-11-26',
      path: '/events',
      visit: false,
      source: null,
    })
    expect(parseHit({ p: '/events', n: true }, host, NOW)).toMatchObject({ visit: false, source: null })
  })

  it('compares the own host with its port (dev)', () => {
    expect(parseHit({ p: '/x', r: 'http://localhost:3000/' }, 'localhost:3000', NOW)?.visit).toBe(false)
    expect(parseHit({ p: '/x', r: 'http://localhost:4000/' }, 'localhost:3000', NOW)?.visit).toBe(true)
  })

  it.each([
    [null],
    ['/x'],
    [{}],
    [{ p: 42 }],
    [{ p: '/admin' }],
    [{ p: '/x', r: 'x'.repeat(3000) }],
    [{ p: '/x', n: 'yes' }],
  ])('ignores %j', (body) => {
    expect(parseHit(body, host, NOW)).toBeNull()
  })
})

describe('parsePeriod', () => {
  it('defaults to the last 30 days, today included', () => {
    expect(parsePeriod({}, NOW)).toEqual({ from: '2026-10-28', to: '2026-11-26', preset: 30 })
    expect(daysBetween('2026-10-28', '2026-11-26')).toBe(30)
  })

  it.each([
    ['7', '2026-11-20'],
    ['365', '2025-11-27'],
  ])('?tage=%s starts on %s', (tage, from) => {
    expect(parsePeriod({ tage }, NOW)).toEqual({ from, to: '2026-11-26', preset: Number(tage) })
  })

  it('an unknown preset falls back to 30 days', () => {
    expect(parsePeriod({ tage: '9999' }, NOW).preset).toBe(30)
  })

  it('takes a from/to pair, swapped if reversed, never past today', () => {
    expect(parsePeriod({ von: '2026-11-01', bis: '2026-11-10' }, NOW)).toEqual({
      from: '2026-11-01',
      to: '2026-11-10',
      preset: null,
    })
    expect(parsePeriod({ von: '2026-11-10', bis: '2026-11-01' }, NOW)).toMatchObject({
      from: '2026-11-01',
      to: '2026-11-10',
    })
    expect(parsePeriod({ von: '2026-11-20', bis: '2027-01-01' }, NOW)).toMatchObject({ to: '2026-11-26' })
  })

  it('ignores dates that do not exist', () => {
    expect(parsePeriod({ von: '2026-02-30', bis: '2026-03-05' }, NOW).preset).toBe(30)
  })

  it('cuts very long periods to their last three years', () => {
    const p = parsePeriod({ von: '2010-01-01', bis: '2026-11-26' }, NOW)
    expect(daysBetween(p.from, p.to)).toBe(3 * 366)
  })

  it('calendar steps ignore DST', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('pageKind', () => {
  it.each([
    ['/blog/mein-post', 'post'],
    ['/blog', 'page'],
    ['/blog/seite/2', 'page'],
    ['/events/repair-cafe', 'event'],
    ['/events', 'page'],
    ['/events/archiv', 'page'],
    ['/events/archiv/2019', 'page'],
    ['/events/calendar.ics', 'page'],
    ['/werkzeug/holz', 'page'],
    ['/mitmachen', 'page'],
  ])('%s → %s', (path, kind) => {
    expect(pageKind(path)).toBe(kind)
  })
})

describe('optedOut', () => {
  it.each([
    [{ globalPrivacyControl: true }, true],
    [{ doNotTrack: '1' }, true],
    [{ doNotTrack: '0' }, false],
    [{}, false],
  ])('%j → %s', (nav, out) => {
    expect(optedOut(nav as Navigator)).toBe(out)
  })
})
