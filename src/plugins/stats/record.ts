import { sql } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'
import type { Hit } from '@/lib/stats/hit'

/**
 * Caps on new rows per day. The beacon can be called by anyone, so a script
 * sending made-up paths or referrers must not grow the tables without bound.
 * Real traffic stays far below: the site has ~400 pages, and a day brings a
 * handful of referring hosts. Rows that exist keep counting past the cap.
 */
export const MAX_PATHS_PER_DAY = 1000
export const MAX_SOURCES_PER_DAY = 300

type Runner = { run: (query: ReturnType<typeof sql>) => Promise<{ rowsAffected: number }> }
const drizzle = (payload: Payload) => (payload.db as unknown as { drizzle: Runner }).drizzle

/**
 * Adds one hit to the day's totals. Each statement is a single atomic SQLite
 * write (increment, or insert-or-increment), so concurrent hits never lose a
 * count. Table and column names are Payload's for `stat-pages` / `stat-sources`
 * (tests/integration/stats.test.ts reads them back through the Local API).
 */
export async function recordHit(payload: Payload, hit: Hit): Promise<void> {
  const db = drizzle(payload)
  const visits = hit.visit ? 1 : 0

  const bumped = await db.run(
    sql`UPDATE stat_pages SET views = views + 1, visits = visits + ${visits} WHERE day = ${hit.day} AND path = ${hit.path}`,
  )
  if (bumped.rowsAffected === 0) {
    await db.run(sql`INSERT INTO stat_pages (day, path, views, visits)
      SELECT ${hit.day}, ${hit.path}, 1, ${visits}
      WHERE (SELECT count(*) FROM stat_pages WHERE day = ${hit.day}) < ${MAX_PATHS_PER_DAY}
      ON CONFLICT (day, path) DO UPDATE SET views = views + 1, visits = visits + excluded.visits`)
  }

  if (!hit.source) return
  const { kind, source } = hit.source
  const counted = await db.run(
    sql`UPDATE stat_sources SET visits = visits + 1 WHERE day = ${hit.day} AND source = ${source}`,
  )
  if (counted.rowsAffected === 0) {
    await db.run(sql`INSERT INTO stat_sources (day, kind, source, visits)
      SELECT ${hit.day}, ${kind}, ${source}, 1
      WHERE (SELECT count(*) FROM stat_sources WHERE day = ${hit.day}) < ${MAX_SOURCES_PER_DAY}
      ON CONFLICT (day, source) DO UPDATE SET visits = visits + 1`)
  }
}
