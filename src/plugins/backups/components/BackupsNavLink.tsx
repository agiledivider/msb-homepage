import type { ServerProps } from 'payload'
import { isAdmin } from '@/plugins/editorial/access'
import { BackupsNavLinkClient } from './BackupsNavLinkClient'

/** "Backups" in the admin sidebar, for admins only. The view checks rights again. */
export function BackupsNavLink({ payload, user }: ServerProps) {
  if (!isAdmin(user)) return null
  return <BackupsNavLinkClient href={`${payload.config.routes.admin}/backups`} />
}
