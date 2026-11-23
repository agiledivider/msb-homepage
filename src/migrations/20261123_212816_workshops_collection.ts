import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`blog_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`workshops_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`blog\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`workshops_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_rels_order_idx\` ON \`blog_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`blog_rels_parent_idx\` ON \`blog_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_rels_path_idx\` ON \`blog_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`blog_rels_workshops_id_idx\` ON \`blog_rels\` (\`workshops_id\`);`)
  await db.run(sql`CREATE TABLE \`_blog_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`workshops_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_blog_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`workshops_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_blog_v_rels_order_idx\` ON \`_blog_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_rels_parent_idx\` ON \`_blog_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_rels_path_idx\` ON \`_blog_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_rels_workshops_id_idx\` ON \`_blog_v_rels\` (\`workshops_id\`);`)
  await db.run(sql`CREATE TABLE \`events_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`workshops_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`workshops_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`events_rels_order_idx\` ON \`events_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_parent_idx\` ON \`events_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_path_idx\` ON \`events_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_workshops_id_idx\` ON \`events_rels\` (\`workshops_id\`);`)
  await db.run(sql`CREATE TABLE \`_events_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`workshops_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_events_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`workshops_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_events_v_rels_order_idx\` ON \`_events_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_rels_parent_idx\` ON \`_events_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_rels_path_idx\` ON \`_events_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_rels_workshops_id_idx\` ON \`_events_v_rels\` (\`workshops_id\`);`)
  await db.run(sql`CREATE TABLE \`workshops_makes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`workshops_makes_order_idx\` ON \`workshops_makes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`workshops_makes_parent_id_idx\` ON \`workshops_makes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`workshops_machines\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`access\` text DEFAULT 'briefing',
  	\`note\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`workshops_machines_order_idx\` ON \`workshops_machines\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`workshops_machines_parent_id_idx\` ON \`workshops_machines\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`workshops_safety\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`workshops_safety_order_idx\` ON \`workshops_safety\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`workshops_safety_parent_id_idx\` ON \`workshops_safety\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`workshops\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`order\` numeric DEFAULT 100,
  	\`icon\` text,
  	\`verbs\` text,
  	\`summary\` text,
  	\`promise\` text,
  	\`cover_id\` integer,
  	\`cover_caption\` text,
  	\`facts_where\` text,
  	\`facts_hours\` text,
  	\`facts_cost\` text,
  	\`materials\` text,
  	\`contact_name\` text,
  	\`contact_role\` text,
  	\`contact_photo_id\` integer,
  	\`contact_link_label\` text,
  	\`contact_link_url\` text,
  	\`contact_note\` text,
  	\`cta_heading\` text,
  	\`cta_text\` text,
  	\`review_status\` text DEFAULT 'draft',
  	\`review_note\` text,
  	\`submitted_at\` text,
  	\`created_by_id\` integer,
  	\`reviewed_by_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`contact_photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`workshops_slug_idx\` ON \`workshops\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`workshops_cover_idx\` ON \`workshops\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_contact_contact_photo_idx\` ON \`workshops\` (\`contact_photo_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_created_by_idx\` ON \`workshops\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_reviewed_by_idx\` ON \`workshops\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_updated_at_idx\` ON \`workshops\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`workshops_created_at_idx\` ON \`workshops\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`workshops__status_idx\` ON \`workshops\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_workshops_v_version_makes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_workshops_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_makes_order_idx\` ON \`_workshops_v_version_makes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_makes_parent_id_idx\` ON \`_workshops_v_version_makes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_workshops_v_version_machines\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`access\` text DEFAULT 'briefing',
  	\`note\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_workshops_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_machines_order_idx\` ON \`_workshops_v_version_machines\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_machines_parent_id_idx\` ON \`_workshops_v_version_machines\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_workshops_v_version_safety\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_workshops_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_safety_order_idx\` ON \`_workshops_v_version_safety\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_safety_parent_id_idx\` ON \`_workshops_v_version_safety\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_workshops_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_order\` numeric DEFAULT 100,
  	\`version_icon\` text,
  	\`version_verbs\` text,
  	\`version_summary\` text,
  	\`version_promise\` text,
  	\`version_cover_id\` integer,
  	\`version_cover_caption\` text,
  	\`version_facts_where\` text,
  	\`version_facts_hours\` text,
  	\`version_facts_cost\` text,
  	\`version_materials\` text,
  	\`version_contact_name\` text,
  	\`version_contact_role\` text,
  	\`version_contact_photo_id\` integer,
  	\`version_contact_link_label\` text,
  	\`version_contact_link_url\` text,
  	\`version_contact_note\` text,
  	\`version_cta_heading\` text,
  	\`version_cta_text\` text,
  	\`version_review_status\` text DEFAULT 'draft',
  	\`version_review_note\` text,
  	\`version_submitted_at\` text,
  	\`version_created_by_id\` integer,
  	\`version_reviewed_by_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`workshops\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_contact_photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_workshops_v_parent_idx\` ON \`_workshops_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version_slug_idx\` ON \`_workshops_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version_cover_idx\` ON \`_workshops_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_contact_version_contact_photo_idx\` ON \`_workshops_v\` (\`version_contact_photo_id\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version_created_by_idx\` ON \`_workshops_v\` (\`version_created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version_reviewed_by_idx\` ON \`_workshops_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version_updated_at_idx\` ON \`_workshops_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version_created_at_idx\` ON \`_workshops_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version__status_idx\` ON \`_workshops_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_created_at_idx\` ON \`_workshops_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_updated_at_idx\` ON \`_workshops_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_workshops_v_latest_idx\` ON \`_workshops_v\` (\`latest\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`workshops_id\` integer REFERENCES workshops(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_workshops_id_idx\` ON \`payload_locked_documents_rels\` (\`workshops_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`blog_rels\`;`)
  await db.run(sql`DROP TABLE \`_blog_v_rels\`;`)
  await db.run(sql`DROP TABLE \`events_rels\`;`)
  await db.run(sql`DROP TABLE \`_events_v_rels\`;`)
  await db.run(sql`DROP TABLE \`workshops_makes\`;`)
  await db.run(sql`DROP TABLE \`workshops_machines\`;`)
  await db.run(sql`DROP TABLE \`workshops_safety\`;`)
  await db.run(sql`DROP TABLE \`workshops\`;`)
  await db.run(sql`DROP TABLE \`_workshops_v_version_makes\`;`)
  await db.run(sql`DROP TABLE \`_workshops_v_version_machines\`;`)
  await db.run(sql`DROP TABLE \`_workshops_v_version_safety\`;`)
  await db.run(sql`DROP TABLE \`_workshops_v\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`blog_id\` integer,
  	\`events_id\` integer,
  	\`pages_id\` integer,
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
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`permissions_id\`) REFERENCES \`permissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`roles_id\`) REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_folders_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "blog_id", "events_id", "pages_id", "media_id", "permissions_id", "roles_id", "payload_mcp_api_keys_id", "users_id", "payload_folders_id") SELECT "id", "order", "parent_id", "path", "blog_id", "events_id", "pages_id", "media_id", "permissions_id", "roles_id", "payload_mcp_api_keys_id", "users_id", "payload_folders_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_permissions_id_idx\` ON \`payload_locked_documents_rels\` (\`permissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_roles_id_idx\` ON \`payload_locked_documents_rels\` (\`roles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_folders_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_folders_id\`);`)
}
