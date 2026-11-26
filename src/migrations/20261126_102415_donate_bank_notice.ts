import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_blocks_donate\` ADD \`bank_notice\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_donate\` ADD \`bank_notice\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_blocks_donate\` DROP COLUMN \`bank_notice\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_donate\` DROP COLUMN \`bank_notice\`;`)
}
