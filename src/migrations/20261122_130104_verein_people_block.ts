import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_people_people\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`role\` text,
  	\`email\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_people\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_people_people_order_idx\` ON \`pages_blocks_people_people\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_people_people_parent_id_idx\` ON \`pages_blocks_people_people\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_people\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'VEREIN',
  	\`heading\` text DEFAULT 'Menschen & Ansprechpartner',
  	\`intro\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_people_order_idx\` ON \`pages_blocks_people\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_people_parent_id_idx\` ON \`pages_blocks_people\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_people_path_idx\` ON \`pages_blocks_people\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_people_people\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`role\` text,
  	\`email\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_people\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_people_people_order_idx\` ON \`_pages_v_blocks_people_people\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_people_people_parent_id_idx\` ON \`_pages_v_blocks_people_people\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_people\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'VEREIN',
  	\`heading\` text DEFAULT 'Menschen & Ansprechpartner',
  	\`intro\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_people_order_idx\` ON \`_pages_v_blocks_people\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_people_parent_id_idx\` ON \`_pages_v_blocks_people\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_people_path_idx\` ON \`_pages_v_blocks_people\` (\`_path\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_people_people\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_people\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_people_people\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_people\`;`)
}
