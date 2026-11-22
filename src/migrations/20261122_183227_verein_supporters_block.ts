import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_supporters_supporters\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`url\` text,
  	\`description\` text,
  	\`logo_id\` integer,
  	\`current\` integer DEFAULT true,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_supporters\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_supporters_supporters_order_idx\` ON \`pages_blocks_supporters_supporters\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_supporters_supporters_parent_id_idx\` ON \`pages_blocks_supporters_supporters\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_supporters_supporters_logo_idx\` ON \`pages_blocks_supporters_supporters\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_supporters\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'DANKE',
  	\`heading\` text DEFAULT 'Unsere Förderer',
  	\`intro\` text,
  	\`former_heading\` text DEFAULT 'Frühere Förderer',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_supporters_order_idx\` ON \`pages_blocks_supporters\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_supporters_parent_id_idx\` ON \`pages_blocks_supporters\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_supporters_path_idx\` ON \`pages_blocks_supporters\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_supporters_supporters\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`url\` text,
  	\`description\` text,
  	\`logo_id\` integer,
  	\`current\` integer DEFAULT true,
  	\`_uuid\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_supporters\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_supporters_supporters_order_idx\` ON \`_pages_v_blocks_supporters_supporters\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_supporters_supporters_parent_id_idx\` ON \`_pages_v_blocks_supporters_supporters\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_supporters_supporters_logo_idx\` ON \`_pages_v_blocks_supporters_supporters\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_supporters\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'DANKE',
  	\`heading\` text DEFAULT 'Unsere Förderer',
  	\`intro\` text,
  	\`former_heading\` text DEFAULT 'Frühere Förderer',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_supporters_order_idx\` ON \`_pages_v_blocks_supporters\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_supporters_parent_id_idx\` ON \`_pages_v_blocks_supporters\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_supporters_path_idx\` ON \`_pages_v_blocks_supporters\` (\`_path\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_supporters_supporters\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_supporters\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_supporters_supporters\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_supporters\`;`)
}
