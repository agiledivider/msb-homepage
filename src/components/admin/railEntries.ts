/** Entries of the closed-sidebar rail (S9.1): built in Nav.tsx, drawn by NavRail.tsx. */
export type RailEntry = { id: string; href: string; label: string; exact?: boolean }
export type RailGroup = { label: string; entries: RailEntry[] }

/** Same rule as Payload's sidebar: the entry's path, or anything below it. */
export const isActive = (pathname: string, { href, exact }: RailEntry) =>
  exact
    ? pathname === href || pathname === `${href}/`
    : pathname.startsWith(href) && (pathname.length === href.length || pathname[href.length] === '/')
