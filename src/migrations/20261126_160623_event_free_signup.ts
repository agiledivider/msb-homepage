import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * S5.19: "Kostenlos" switch and external sign-up address on events.
 * Existing events (and their versions) default to free, so events nobody
 * edits keep today's "kostenlos" invitation. No backfill from free text.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` ADD \`free\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`signup_url\` text;`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_free\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_signup_url\` text;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`free\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`signup_url\`;`)
  await db.run(sql`ALTER TABLE \`_events_v\` DROP COLUMN \`version_free\`;`)
  await db.run(sql`ALTER TABLE \`_events_v\` DROP COLUMN \`version_signup_url\`;`)
}
