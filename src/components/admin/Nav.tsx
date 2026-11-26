import { DefaultNav } from '@payloadcms/next/rsc'
import { EntityType, groupNavItems } from '@payloadcms/ui/shared'
import type { ServerProps, StaticLabel } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { isAdmin } from '@/plugins/editorial/access'
import { NavRail } from './NavRail'
import type { RailGroup } from './railEntries'

// The template passes these next to the server props (as DefaultNav reads them).
type NavProps = ServerProps & { visibleEntities?: { collections: string[]; globals: string[] } }

/**
 * Admin sidebar (`admin.components.Nav`): Payload's own nav, plus an icon rail
 * that stays on screen while the sidebar is closed (S9.1). Payload makes the
 * closed sidebar `inert`, so the rail is a separate element, not a narrow
 * version of the sidebar. Its entries mirror the sidebar: "Start" from
 * NavBrand, "Browse by Folder", the collection/global groups Payload shows this user, and
 * "Backups" for admins (src/plugins/backups). Icons come from the same
 * `nav-*` ids (scripts/nav-icons.ts). At the bottom: "Abmelden" (S9.6).
 */
export function Nav(props: NavProps) {
  const { i18n, payload, permissions, user, visibleEntities } = props
  if (!payload?.config || !permissions || !i18n) return <DefaultNav {...props} />

  const admin = payload.config.routes.admin
  const label = (l: StaticLabel) => (typeof l === 'string' ? l : (l[i18n.language] ?? Object.values(l)[0] ?? ''))
  const visible = visibleEntities ?? { collections: [], globals: [] }
  const { folders } = payload.config

  const groups = groupNavItems(
    [
      ...payload.config.collections
        .filter(({ slug }) => visible.collections.includes(slug))
        .map((entity) => ({ type: EntityType.collection as const, entity })),
      ...payload.config.globals
        .filter(({ slug }) => visible.globals.includes(slug))
        .map((entity) => ({ type: EntityType.global as const, entity })),
    ],
    permissions,
    i18n,
  )

  const rail: RailGroup[] = [
    {
      label: 'Start',
      entries: [
        { id: 'nav-start', href: admin, label: 'Start', exact: true },
        // Payload's "Browse by Folder" button under Start
        ...(folders !== false && folders.browseByFolder
          ? [
              {
                id: 'nav-folders',
                href: `${admin}${payload.config.admin.routes.browseByFolder}`,
                label: i18n.t('folder:browseByFolder'),
              },
            ]
          : []),
      ],
    },
    ...groups.map((g) => ({
      label: g.label,
      entries: g.entities.map(({ slug, type, label: l }) =>
        type === EntityType.global
          ? { id: `nav-global-${slug}`, href: `${admin}/globals/${slug}`, label: label(l) }
          : { id: `nav-${slug}`, href: `${admin}/collections/${slug}`, label: label(l) },
      ),
    })),
    ...(isAdmin(user)
      ? [{ label: 'Backups', entries: [{ id: 'nav-backups', href: `${admin}/backups`, label: 'Backups' }] }]
      : []),
  ]

  // S9.6: the same link as Payload's own logout button in the open sidebar.
  const logout = {
    href: formatAdminURL({ adminRoute: admin, path: payload.config.admin.routes.logout }),
    label: i18n.t('authentication:logOut'),
  }

  return (
    <>
      <DefaultNav {...props} />
      <NavRail groups={rail} logout={logout} />
    </>
  )
}
