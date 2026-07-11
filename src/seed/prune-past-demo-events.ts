import config from '@payload-config'
import { getPayload } from 'payload'

/* Remove synthetic demo events that lie in the past, so /events/archiv shows only
   the real migrated events. Only touches events without a legacyId (i.e. not
   migrated real content); future demo events and all migrated events are kept.
   Stop the dev server first (DB lock).

     pnpm payload run src/seed/prune-past-demo-events.ts
*/
const payload = await getPayload({ config })
const res = await payload.delete({
  collection: 'events',
  where: {
    and: [{ legacyId: { exists: false } }, { date: { less_than: new Date().toISOString() } }],
  },
})
const removed = Array.isArray(res.docs) ? res.docs.length : 0
payload.logger.info(`✓ Removed ${removed} past demo events (kept migrated + future events).`)
