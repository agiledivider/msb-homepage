import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`stat_pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`day\` text NOT NULL,
  	\`path\` text NOT NULL,
  	\`views\` numeric DEFAULT 0 NOT NULL,
  	\`visits\` numeric DEFAULT 0 NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`stat_pages_day_idx\` ON \`stat_pages\` (\`day\`);`)
  await db.run(sql`CREATE INDEX \`stat_pages_updated_at_idx\` ON \`stat_pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`stat_pages_created_at_idx\` ON \`stat_pages\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`day_path_idx\` ON \`stat_pages\` (\`day\`,\`path\`);`)
  await db.run(sql`CREATE TABLE \`stat_sources\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`day\` text NOT NULL,
  	\`kind\` text NOT NULL,
  	\`source\` text NOT NULL,
  	\`visits\` numeric DEFAULT 0 NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`stat_sources_day_idx\` ON \`stat_sources\` (\`day\`);`)
  await db.run(sql`CREATE INDEX \`stat_sources_updated_at_idx\` ON \`stat_sources\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`stat_sources_created_at_idx\` ON \`stat_sources\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`day_source_idx\` ON \`stat_sources\` (\`day\`,\`source\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`stat_pages_id\` integer REFERENCES stat_pages(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`stat_sources_id\` integer REFERENCES stat_sources(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_stat_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`stat_pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_stat_sources_id_idx\` ON \`payload_locked_documents_rels\` (\`stat_sources_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`stat_pages\`;`)
  await db.run(sql`DROP TABLE \`stat_sources\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`blog_id\` integer,
  	\`events_id\` integer,
  	\`pages_id\` integer,
  	\`workshops_id\` integer,
  	\`media_id\` integer,
  	\`permissions_id\` integer,
  	\`roles_id\` integer,
  	\`payload_mcp_api_keys_id\` integer,
  	\`users_id\` integer,
  	\`payload_folders_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_id\`) REFERENCES \`blog\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`workshops_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`permissions_id\`) REFERENCES \`permissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`roles_id\`) REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_folders_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "blog_id", "events_id", "pages_id", "workshops_id", "media_id", "permissions_id", "roles_id", "payload_mcp_api_keys_id", "users_id", "payload_folders_id") SELECT "id", "order", "parent_id", "path", "blog_id", "events_id", "pages_id", "workshops_id", "media_id", "permissions_id", "roles_id", "payload_mcp_api_keys_id", "users_id", "payload_folders_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_workshops_id_idx\` ON \`payload_locked_documents_rels\` (\`workshops_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_permissions_id_idx\` ON \`payload_locked_documents_rels\` (\`permissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_roles_id_idx\` ON \`payload_locked_documents_rels\` (\`roles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_folders_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_folders_id\`);`)
}
