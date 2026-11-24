/**
 * The closed-sidebar rail (S9.1) highlights the same entry as Payload's open
 * sidebar: the entry's own path or anything below it, "Start" only on itself.
 */
import { describe, expect, it } from 'vitest'
import { isActive } from '@/components/admin/railEntries'

const blog = { id: 'nav-blog', href: '/admin/collections/blog', label: 'Blog' }
const start = { id: 'nav-start', href: '/admin', label: 'Start', exact: true }

describe('rail: current entry', () => {
  it.each([
    [blog, '/admin/collections/blog', true],
    [blog, '/admin/collections/blog/42', true],
    [blog, '/admin/collections/blog/create', true],
    [blog, '/admin/collections/blogger', false],
    [blog, '/admin/collections/events', false],
    [start, '/admin', true],
    [start, '/admin/', true],
    [start, '/admin/collections/blog', false],
  ])('%o on %s → %s', (entry, pathname, expected) => {
    expect(isActive(pathname, entry)).toBe(expected)
  })
})
