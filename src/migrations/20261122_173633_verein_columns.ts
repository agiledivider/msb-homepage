import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_quote\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_quote_order_idx\` ON \`pages_blocks_quote\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_quote_parent_id_idx\` ON \`pages_blocks_quote\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_quote_path_idx\` ON \`pages_blocks_quote\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_timeline_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`year\` text,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_timeline\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_timeline_items_order_idx\` ON \`pages_blocks_timeline_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_timeline_items_parent_id_idx\` ON \`pages_blocks_timeline_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_timeline\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text DEFAULT 'DIE KURZE GESCHICHTE',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_timeline_order_idx\` ON \`pages_blocks_timeline\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_timeline_parent_id_idx\` ON \`pages_blocks_timeline\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_timeline_path_idx\` ON \`pages_blocks_timeline\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`split\` text DEFAULT '3-2',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_order_idx\` ON \`pages_blocks_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_parent_id_idx\` ON \`pages_blocks_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_path_idx\` ON \`pages_blocks_columns\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_values_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_values\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_values_items_order_idx\` ON \`pages_blocks_values_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_values_items_parent_id_idx\` ON \`pages_blocks_values_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_values_order_idx\` ON \`pages_blocks_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_values_parent_id_idx\` ON \`pages_blocks_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_values_path_idx\` ON \`pages_blocks_values\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_quote\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_quote_order_idx\` ON \`_pages_v_blocks_quote\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_quote_parent_id_idx\` ON \`_pages_v_blocks_quote\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_quote_path_idx\` ON \`_pages_v_blocks_quote\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_timeline_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`year\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_timeline\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_timeline_items_order_idx\` ON \`_pages_v_blocks_timeline_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_timeline_items_parent_id_idx\` ON \`_pages_v_blocks_timeline_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_timeline\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text DEFAULT 'DIE KURZE GESCHICHTE',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_timeline_order_idx\` ON \`_pages_v_blocks_timeline\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_timeline_parent_id_idx\` ON \`_pages_v_blocks_timeline\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_timeline_path_idx\` ON \`_pages_v_blocks_timeline\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`split\` text DEFAULT '3-2',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_order_idx\` ON \`_pages_v_blocks_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_parent_id_idx\` ON \`_pages_v_blocks_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_path_idx\` ON \`_pages_v_blocks_columns\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_values_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_values\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_values_items_order_idx\` ON \`_pages_v_blocks_values_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_values_items_parent_id_idx\` ON \`_pages_v_blocks_values_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_values_order_idx\` ON \`_pages_v_blocks_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_values_parent_id_idx\` ON \`_pages_v_blocks_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_values_path_idx\` ON \`_pages_v_blocks_values\` (\`_path\`);`)

  // Data: converting /verein to Zwei Spalten + Werte happens in src/seed/prod.ts,
  // after all migrations. It used to run here through the Local API, which
  // queries every block table the *current* code knows, so it failed on any DB
  // not yet at the later migrations (no such table: pages_blocks_documents).
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_quote\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_timeline_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_timeline\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_columns\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_values_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_values\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_quote\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_timeline_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_timeline\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_columns\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_values_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_values\`;`)
}
