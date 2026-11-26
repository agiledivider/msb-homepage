import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/** S2.6: AI keys get an optional end date and a "last used" stamp. Existing keys stay unlimited. */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`expires_at\` text;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`last_used_at\` text;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`expires_at\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`last_used_at\`;`)
}
