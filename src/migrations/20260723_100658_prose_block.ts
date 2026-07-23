import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_prose\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`body\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_prose_order_idx\` ON \`pages_blocks_prose\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_prose_parent_id_idx\` ON \`pages_blocks_prose\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_prose_path_idx\` ON \`pages_blocks_prose\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_prose\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`body\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_prose_order_idx\` ON \`_pages_v_blocks_prose\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_prose_parent_id_idx\` ON \`_pages_v_blocks_prose\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_prose_path_idx\` ON \`_pages_v_blocks_prose\` (\`_path\`);`)
  await db.run(sql`ALTER TABLE \`blog\` ADD \`legacy_id\` numeric;`)
  await db.run(sql`CREATE INDEX \`blog_legacy_id_idx\` ON \`blog\` (\`legacy_id\`);`)
  await db.run(sql`ALTER TABLE \`_blog_v\` ADD \`version_legacy_id\` numeric;`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_legacy_id_idx\` ON \`_blog_v\` (\`version_legacy_id\`);`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`legacy_id\` numeric;`)
  await db.run(sql`CREATE INDEX \`events_legacy_id_idx\` ON \`events\` (\`legacy_id\`);`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_legacy_id\` numeric;`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_legacy_id_idx\` ON \`_events_v\` (\`version_legacy_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_prose\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_prose\`;`)
  await db.run(sql`DROP INDEX \`blog_legacy_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`blog\` DROP COLUMN \`legacy_id\`;`)
  await db.run(sql`DROP INDEX \`_blog_v_version_version_legacy_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`_blog_v\` DROP COLUMN \`version_legacy_id\`;`)
  await db.run(sql`DROP INDEX \`events_legacy_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`legacy_id\`;`)
  await db.run(sql`DROP INDEX \`_events_v_version_version_legacy_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`_events_v\` DROP COLUMN \`version_legacy_id\`;`)
}
