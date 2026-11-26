/**
 * Site search text handling (S5.17): German words match whatever the case or
 * umlaut spelling, matches are highlighted in the original spelling, snippets
 * show the place of the first match.
 */
import { describe, expect, it } from 'vitest'
import { highlight, normalize, plainText, queryTerms, snippet } from '@/lib/search/text'

const hits = (segs: Array<{ text: string; hit: boolean }>) => segs.filter((s) => s.hit).map((s) => s.text)

describe('search text', () => {
  it.each([
    ['Löten', 'loeten'],
    ['LÖTEN', 'loeten'],
    ['Loeten', 'loeten'],
    ['Straße', 'strasse'],
    ['Café', 'cafe'],
    ['Übung macht Ärger', 'uebung macht aerger'],
  ])('normalises %s to %s', (raw, out) => {
    expect(normalize(raw)).toBe(out)
  })

  it('splits the query into normalised words of two letters or more', () => {
    expect(queryTerms('  Löten & 3D-Druck, a ')).toEqual(['loeten', '3d', 'druck'])
    expect(queryTerms('x')).toEqual([])
  })

  it.each([
    ['Löten', 'Wir löten heute', ['löten']],
    ['loeten', 'LÖTEN lernen', ['LÖTEN']],
    ['strasse', 'Kennedyallee, Bonner Straße', ['Straße']],
    ['laser', 'Lasercutter und Laser-Gravur', ['Laser', 'Laser']],
  ])('highlights "%s" in the original spelling', (q, text, expected) => {
    expect(hits(highlight(text, queryTerms(q)))).toEqual(expected)
  })

  it('keeps every character when highlighting', () => {
    const text = 'Repair-Café: Löten, Nähen und Schrauben'
    expect(
      highlight(text, queryTerms('café nähen'))
        .map((s) => s.text)
        .join(''),
    ).toBe(text)
  })

  it('cuts a snippet around the first match, marking cuts with …', () => {
    const long = `${'Vorwort '.repeat(40)}Hier geht es um den Lasercutter und seine Einweisung. ${'Nachwort '.repeat(40)}`
    const segs = snippet(long, queryTerms('lasercutter'), 120)
    const text = segs.map((s) => s.text).join('')
    expect(text.startsWith('…')).toBe(true)
    expect(text.endsWith('…')).toBe(true)
    expect(hits(segs)).toEqual(['Lasercutter'])
    expect(text.length).toBeLessThan(140)
  })

  it('reads text from rich text and blocks, not ids, links or settings', () => {
    const layout = [
      {
        id: 'abc123',
        blockType: 'prose',
        heading: 'Satzung',
        tag: 'VEREIN',
        body: {
          root: {
            children: [
              { type: 'paragraph', children: [{ type: 'text', text: 'Der Verein heißt' }] },
              {
                type: 'list',
                tag: 'ul',
                children: [{ type: 'listitem', children: [{ type: 'text', text: 'Punkt' }] }],
              },
            ],
          },
        },
        link: { url: 'https://example.org/x', label: 'Mehr lesen' },
        tagColor: 'green',
      },
    ]
    expect(plainText(layout)).toEqual(['Satzung', 'VEREIN', 'Der Verein heißt', 'Punkt', 'Mehr lesen'])
  })
})
