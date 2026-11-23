import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`workshops_find\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`workshops_create\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`workshops_update\` integer DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`workshops_find\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`workshops_create\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`workshops_update\`;`)
}
