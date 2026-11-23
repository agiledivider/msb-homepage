import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops_items\` ADD \`verbs\` text;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops_items\` ADD \`icon\` text;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops_items\` ADD \`url\` text;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops\` ADD \`hint\` text;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops\` ADD \`hint_cta_label\` text;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops\` ADD \`hint_cta_url\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops_items\` ADD \`verbs\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops_items\` ADD \`icon\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops_items\` ADD \`url\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops\` ADD \`hint\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops\` ADD \`hint_cta_label\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops\` ADD \`hint_cta_url\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops_items\` DROP COLUMN \`verbs\`;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops_items\` DROP COLUMN \`icon\`;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops_items\` DROP COLUMN \`url\`;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops\` DROP COLUMN \`hint\`;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops\` DROP COLUMN \`hint_cta_label\`;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_workshops\` DROP COLUMN \`hint_cta_url\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops_items\` DROP COLUMN \`verbs\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops_items\` DROP COLUMN \`icon\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops_items\` DROP COLUMN \`url\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops\` DROP COLUMN \`hint\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops\` DROP COLUMN \`hint_cta_label\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_workshops\` DROP COLUMN \`hint_cta_url\`;`)
}
