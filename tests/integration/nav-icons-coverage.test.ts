/**
 * Every collection and global that can appear in the admin sidebar has an
 * icon (scripts/nav-icons.ts): the closed sidebar's rail (S9.1) shows only
 * icons, so an entry without one would be an empty square there.
 */
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { NAV_ICONS } from '../../scripts/nav-icons'

let payload: Payload

beforeAll(async () => {
  const { getPayloadClient } = await import('@/lib/getPayload')
  payload = await getPayloadClient()
})

describe('admin nav icons cover the sidebar', () => {
  it('has an icon for every collection and global the sidebar can show', () => {
    const ids = new Set(NAV_ICONS.map(([id]) => id))
    // `hidden: true` never shows; a function (e.g. Users: admins only) can.
    const shown = <T extends { slug: string; admin?: { hidden?: unknown } }>(list: T[]) =>
      list.filter((e) => e.admin?.hidden !== true).map((e) => e.slug)
    const entries = [
      ...shown(payload.config.collections).map((slug) => `nav-${slug}`),
      ...shown(payload.config.globals).map((slug) => `nav-global-${slug}`),
    ]
    expect(entries.filter((id) => !ids.has(id))).toEqual([])
  })
})
