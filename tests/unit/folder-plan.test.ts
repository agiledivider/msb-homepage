/**
 * Filing posts and events into Blog|Events / year / month, and taking along
 * only the images that belong to exactly one of them.
 */
import { describe, expect, it } from 'vitest'
import { folderPath, mediaFieldNames, mediaRefs, soleOwners } from '@/seed/folderPlan'

describe('folderPath', () => {
  it.each([
    ['2024-05-12T12:00:00.000Z', ['Events', '2024', '05 Mai']],
    ['2018-03-03T12:00:00.000Z', ['Events', '2018', '03 März']],
    // 23:30 UTC on New Year's Eve is already January in Bonn.
    ['2025-12-31T23:30:00.000Z', ['Events', '2026', '01 Januar']],
    // and summer time: 22:30 UTC on 31 July is 00:30 on 1 August in Bonn.
    ['2024-07-31T22:30:00.000Z', ['Events', '2024', '08 August']],
  ])('files %s under %j (Berlin time)', (iso, path) => {
    expect(folderPath('Events', iso)).toEqual(path)
  })

  it('refuses a missing date instead of inventing one', () => {
    expect(() => folderPath('Blog', 'not a date')).toThrow()
  })
})

describe('mediaFieldNames', () => {
  it('finds media uploads at any depth, also inside blocks and tabs', () => {
    const names = mediaFieldNames([
      { name: 'title', type: 'text' },
      { name: 'cover', type: 'upload', relationTo: 'media' },
      { name: 'author', type: 'relationship', relationTo: 'users' },
      { type: 'tabs', tabs: [{ label: 'A', fields: [{ name: 'logo', type: 'upload', relationTo: 'media' }] }] },
      {
        name: 'layout',
        type: 'blocks',
        blocks: [
          {
            slug: 'x',
            fields: [
              { name: 'items', type: 'array', fields: [{ name: 'photo', type: 'upload', relationTo: 'media' }] },
            ],
          },
        ],
      },
    ] as never)
    expect([...names].sort()).toEqual(['cover', 'logo', 'photo'])
  })
})

describe('mediaRefs', () => {
  const names = new Set(['image', 'cover'])

  it('collects field values, populated objects and rich-text uploads and block images', () => {
    const doc = {
      image: 4,
      nested: { cover: { id: 9, url: '/x.jpg' } },
      body: {
        root: {
          children: [
            { type: 'paragraph', children: [] },
            { type: 'upload', relationTo: 'media', value: 7 },
            { type: 'upload', relationTo: 'other', value: 99 },
            { type: 'block', fields: { blockType: 'polaroidCard', image: 8 } },
          ],
        },
      },
      count: 3,
    }
    expect([...mediaRefs(doc, names)].sort()).toEqual([4, 7, 8, 9])
  })
})

describe('soleOwners', () => {
  it('keeps only media used by exactly one document', () => {
    const usage = new Map([
      ['events:1', new Set<number | string>([10, 11])],
      ['events:2', new Set<number | string>([11, 12])],
      ['pages:5', new Set<number | string>([12])],
    ])
    expect(Object.fromEntries(soleOwners(usage))).toEqual({ '10': 'events:1' })
  })
})
