import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`site_settings_footer_social\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`platform\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_footer_social_order_idx\` ON \`site_settings_footer_social\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_footer_social_parent_id_idx\` ON \`site_settings_footer_social\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`footer_phone\` text;`)
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`footer_email\` text;`)
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`footer_contact\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`site_settings_footer_social\`;`)
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`footer_contact\` text;`)
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`footer_phone\`;`)
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`footer_email\`;`)
}
