import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog\` ADD \`hide_from_hero\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`_blog_v\` ADD \`version_hide_from_hero\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`hide_from_hero\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_hide_from_hero\` integer DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog\` DROP COLUMN \`hide_from_hero\`;`)
  await db.run(sql`ALTER TABLE \`_blog_v\` DROP COLUMN \`version_hide_from_hero\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`hide_from_hero\`;`)
  await db.run(sql`ALTER TABLE \`_events_v\` DROP COLUMN \`version_hide_from_hero\`;`)
}
