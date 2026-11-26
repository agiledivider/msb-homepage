import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * S5.15: "Nur für Mitglieder" switch on events.
 *
 * Backfill, once: events that existed before the switch marked members-only
 * events only by their free-text label ("nur für Mitglieder", "WORKSHOP ·
 * TICKET · MITGLIEDER" …). Those get the switch, in the live row and in every
 * version (so drafts in progress carry it too). Labels that also welcome
 * guests ("für Interessierte, Gäste und Mitglieder") don't. It runs here and
 * not in the prod seed so an editor who switches it off later isn't overruled
 * on the next start. Plain SQL only (no Local API in migrations, D-010).
 */
const IS_MEMBERS_LABEL = (col: string) =>
  `lower(${col}) like '%mitglied%'
   and ${col} not like '%äste%' and ${col} not like '%ÄSTE%'
   and lower(${col}) not like '%gaeste%'
   and lower(${col}) not like '%interessierte%'
   and lower(${col}) not like '%für alle%' and lower(${col}) not like '%fÜr alle%'`

export const BACKFILL = [
  `update events set members_only = 1 where ${IS_MEMBERS_LABEL('category')}`,
  `update _events_v set version_members_only = 1 where ${IS_MEMBERS_LABEL('version_category')}`,
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` ADD \`members_only\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_members_only\` integer DEFAULT false;`)
  for (const statement of BACKFILL) await db.run(sql.raw(statement))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`members_only\`;`)
  await db.run(sql`ALTER TABLE \`_events_v\` DROP COLUMN \`version_members_only\`;`)
}
