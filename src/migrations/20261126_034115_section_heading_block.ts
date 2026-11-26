import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_section_heading\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`heading\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_heading_order_idx\` ON \`pages_blocks_section_heading\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_heading_parent_id_idx\` ON \`pages_blocks_section_heading\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_heading_path_idx\` ON \`pages_blocks_section_heading\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_section_heading\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`heading\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_heading_order_idx\` ON \`_pages_v_blocks_section_heading\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_heading_parent_id_idx\` ON \`_pages_v_blocks_section_heading\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_heading_path_idx\` ON \`_pages_v_blocks_section_heading\` (\`_path\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_section_heading\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_section_heading\`;`)
}
