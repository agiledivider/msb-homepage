/**
 * S9.6: with the admin sidebar closed, the icon rail offers a labelled logout
 * that uses the same link as Payload's own logout button.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ hydrated: true, navOpen: false }))
vi.mock('@payloadcms/ui', () => ({ useNav: () => nav }))
vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }))

const { NavRail } = await import('@/components/admin/NavRail')

const groups = [{ label: 'Start', entries: [{ id: 'nav-start', href: '/admin', label: 'Start', exact: true }] }]
const logout = { href: '/admin/logout', label: 'Abmelden' }

describe('closed-sidebar rail: logout', () => {
  it('shows a labelled logout link', () => {
    const html = renderToStaticMarkup(<NavRail groups={groups} logout={logout} />)
    expect(html).toMatch(/<a [^>]*aria-label="Abmelden"[^>]*href="\/admin\/logout"/)
    expect(html).toContain('data-nav-icon="nav-logout"')
  })

  it('is not drawn while the sidebar is open (Payload shows its own button)', () => {
    nav.navOpen = true
    expect(renderToStaticMarkup(<NavRail groups={groups} logout={logout} />)).toBe('')
    nav.navOpen = false
  })
})
