import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`site_settings_opening_hours_fallback\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`day\` text,
  	\`note\` text,
  	\`time\` text,
  	\`highlight\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_opening_hours_fallback_order_idx\` ON \`site_settings_opening_hours_fallback\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_opening_hours_fallback_parent_id_idx\` ON \`site_settings_opening_hours_fallback\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`opening_hours_ics_url\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`site_settings_opening_hours_fallback\`;`)
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`opening_hours_ics_url\`;`)
}
