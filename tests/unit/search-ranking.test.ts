/**
 * Site search ranking (S5.17): every word must match; a whole word beats a
 * word start beats a match inside a word (only from 4 letters); title beats
 * lead beats body; words next to each other in order get a phrase bonus.
 */
import { describe, expect, it } from 'vitest'
import { matchKind, score } from '@/lib/search'
import { highlight, normalize, queryTerms } from '@/lib/search/text'

const TODAY = new Date('2026-06-15T00:00:00Z')
const aDoc = (o: {
  title?: string
  lead?: string
  body?: string
  kind?: 'blog' | 'event' | 'page' | 'workshop'
  date?: string
}) => ({
  kind: o.kind ?? 'blog',
  nTitle: normalize(o.title ?? ''),
  nLead: normalize(o.lead ?? ''),
  nBody: normalize(o.body ?? ''),
  date: o.date ?? null,
})
const s = (q: string, doc: ReturnType<typeof aDoc>) => score(doc, queryTerms(q), TODAY)

describe('search ranking', () => {
  it.each([
    ['laser & cnc', 'laser', 3],
    ['lasercutter', 'laser', 2],
    ['lasercutter', 'cutter', 1],
    ['start', 'art', 0],
    ['artikel', 'art', 2],
    ['3d-druck', '3d', 3],
  ] as const)('in "%s", "%s" is a match of kind %d', (hay, term, kind) => {
    expect(matchKind(hay, term)).toBe(kind)
  })

  it('needs every word', () => {
    expect(s('laser holz', aDoc({ title: 'Laser & CNC' }))).toBe(0)
    expect(s('laser holz', aDoc({ title: 'Laser & CNC', body: 'Auch Holz geht.' }))).toBeGreaterThan(0)
  })

  it('ranks a whole word over a word start over a match inside a word', () => {
    const whole = s('cutter', aDoc({ title: 'Der Cutter' }))
    const start = s('cutter', aDoc({ title: 'Cutterkurs' }))
    const inside = s('cutter', aDoc({ title: 'Lasercutter' }))
    expect(whole).toBeGreaterThan(start)
    expect(start).toBeGreaterThan(inside)
    expect(inside).toBeGreaterThan(0)
  })

  it('ranks the title over the lead over the body', () => {
    const title = s('repair', aDoc({ title: 'Repair-Café' }))
    const lead = s('repair', aDoc({ lead: 'Repair-Café im März' }))
    const body = s('repair', aDoc({ body: 'Danach zum Repair-Café' }))
    expect(title).toBeGreaterThan(lead)
    expect(lead).toBeGreaterThan(body)
  })

  it('puts the words next to each other above the same words apart', () => {
    const phrase = s('3d druck', aDoc({ title: '3D-Druck für Einsteiger' }))
    const apart = s('3d druck', aDoc({ title: 'Druckluft und 3D-Scanner' }))
    expect(phrase).toBeGreaterThan(apart)
  })

  it('lifts upcoming events, and workshops whose title matches', () => {
    const next = s('brunch', aDoc({ kind: 'event', title: 'Maker Brunch', date: '2026-07-01T09:00:00Z' }))
    const past = s('brunch', aDoc({ kind: 'event', title: 'Maker Brunch', date: '2025-07-01T09:00:00Z' }))
    expect(next).toBeGreaterThan(past)
    const workshop = s('textil', aDoc({ kind: 'workshop', title: 'Textil & Handarbeit' }))
    const post = s('textil', aDoc({ kind: 'blog', title: 'Textil & Handarbeit' }))
    expect(workshop).toBeGreaterThan(post)
  })

  it('highlights a short word only at a word start, like the scoring', () => {
    const marked = highlight('Start der Kunst-Art', queryTerms('art')).filter((x) => x.hit)
    expect(marked.map((x) => x.text)).toEqual(['Art'])
  })
})
