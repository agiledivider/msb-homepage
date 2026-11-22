import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_press_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`outlet\` text,
  	\`date\` text,
  	\`title\` text,
  	\`url\` text,
  	\`document_id\` integer,
  	FOREIGN KEY (\`document_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_press\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_press_items_order_idx\` ON \`pages_blocks_press_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_press_items_parent_id_idx\` ON \`pages_blocks_press_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_press_items_document_idx\` ON \`pages_blocks_press_items\` (\`document_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_press\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'PRESSE',
  	\`heading\` text DEFAULT 'Wir in den Medien',
  	\`intro\` text,
  	\`contact_email\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_press_order_idx\` ON \`pages_blocks_press\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_press_parent_id_idx\` ON \`pages_blocks_press\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_press_path_idx\` ON \`pages_blocks_press\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_press_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`outlet\` text,
  	\`date\` text,
  	\`title\` text,
  	\`url\` text,
  	\`document_id\` integer,
  	\`_uuid\` text,
  	FOREIGN KEY (\`document_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_press\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_press_items_order_idx\` ON \`_pages_v_blocks_press_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_press_items_parent_id_idx\` ON \`_pages_v_blocks_press_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_press_items_document_idx\` ON \`_pages_v_blocks_press_items\` (\`document_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_press\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'PRESSE',
  	\`heading\` text DEFAULT 'Wir in den Medien',
  	\`intro\` text,
  	\`contact_email\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_press_order_idx\` ON \`_pages_v_blocks_press\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_press_parent_id_idx\` ON \`_pages_v_blocks_press\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_press_path_idx\` ON \`_pages_v_blocks_press\` (\`_path\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_press_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_press\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_press_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_press\`;`)
}
