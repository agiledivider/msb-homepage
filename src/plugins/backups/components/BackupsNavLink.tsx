import type { ServerProps } from 'payload'
import { isAdmin } from '@/plugins/editorial/access'

/** "Backups" in the admin sidebar, for admins only. The view checks rights again. */
export function BackupsNavLink({ payload, user }: ServerProps) {
  if (!isAdmin(user)) return null
  return (
    <a className="nav__link" href={`${payload.config.routes.admin}/backups`} id="nav-backups">
      <span className="nav__link-label">Backups</span>
    </a>
  )
}
