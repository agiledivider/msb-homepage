import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`payload_mcp_api_keys\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`label\` text,
  	\`description\` text,
  	\`blog_find\` integer DEFAULT true,
  	\`blog_create\` integer DEFAULT true,
  	\`blog_update\` integer DEFAULT true,
  	\`events_find\` integer DEFAULT true,
  	\`events_create\` integer DEFAULT true,
  	\`events_update\` integer DEFAULT true,
  	\`pages_find\` integer DEFAULT true,
  	\`pages_create\` integer DEFAULT true,
  	\`pages_update\` integer DEFAULT true,
  	\`media_find\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`enable_a_p_i_key\` integer,
  	\`api_key\` text,
  	\`api_key_index\` text,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_mcp_api_keys_user_idx\` ON \`payload_mcp_api_keys\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_mcp_api_keys_updated_at_idx\` ON \`payload_mcp_api_keys\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_mcp_api_keys_created_at_idx\` ON \`payload_mcp_api_keys\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`blog\` ADD \`created_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`CREATE INDEX \`blog_created_by_idx\` ON \`blog\` (\`created_by_id\`);`)
  await db.run(sql`ALTER TABLE \`_blog_v\` ADD \`version_created_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_created_by_idx\` ON \`_blog_v\` (\`version_created_by_id\`);`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`created_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`CREATE INDEX \`events_created_by_idx\` ON \`events\` (\`created_by_id\`);`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_created_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_created_by_idx\` ON \`_events_v\` (\`version_created_by_id\`);`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`created_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`CREATE INDEX \`pages_created_by_idx\` ON \`pages\` (\`created_by_id\`);`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_created_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_by_idx\` ON \`_pages_v\` (\`version_created_by_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`payload_mcp_api_keys_id\` integer REFERENCES payload_mcp_api_keys(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_preferences_rels\` ADD \`payload_mcp_api_keys_id\` integer REFERENCES payload_mcp_api_keys(id);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_payload_mcp_api_keys_id_idx\` ON \`payload_preferences_rels\` (\`payload_mcp_api_keys_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_blog\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`legacy_id\` numeric,
  	\`author\` text,
  	\`reading_time\` text,
  	\`published_at\` text,
  	\`subtitle\` text,
  	\`excerpt\` text,
  	\`badge\` text DEFAULT 'NEU IM BLOG',
  	\`cover_id\` integer,
  	\`body\` text,
  	\`review_status\` text DEFAULT 'draft',
  	\`review_note\` text,
  	\`submitted_at\` text,
  	\`reviewed_by_id\` integer,
  	\`folder_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_blog\`("id", "title", "slug", "legacy_id", "author", "reading_time", "published_at", "subtitle", "excerpt", "badge", "cover_id", "body", "review_status", "review_note", "submitted_at", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status") SELECT "id", "title", "slug", "legacy_id", "author", "reading_time", "published_at", "subtitle", "excerpt", "badge", "cover_id", "body", "review_status", "review_note", "submitted_at", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status" FROM \`blog\`;`)
  await db.run(sql`DROP TABLE \`blog\`;`)
  await db.run(sql`ALTER TABLE \`__new_blog\` RENAME TO \`blog\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_slug_idx\` ON \`blog\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`blog_legacy_id_idx\` ON \`blog\` (\`legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_cover_idx\` ON \`blog\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_reviewed_by_idx\` ON \`blog\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_folder_idx\` ON \`blog\` (\`folder_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_updated_at_idx\` ON \`blog\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_created_at_idx\` ON \`blog\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`blog__status_idx\` ON \`blog\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__blog_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_legacy_id\` numeric,
  	\`version_author\` text,
  	\`version_reading_time\` text,
  	\`version_published_at\` text,
  	\`version_subtitle\` text,
  	\`version_excerpt\` text,
  	\`version_badge\` text DEFAULT 'NEU IM BLOG',
  	\`version_cover_id\` integer,
  	\`version_body\` text,
  	\`version_review_status\` text DEFAULT 'draft',
  	\`version_review_note\` text,
  	\`version_submitted_at\` text,
  	\`version_reviewed_by_id\` integer,
  	\`version_folder_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`blog\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__blog_v\`("id", "parent_id", "version_title", "version_slug", "version_legacy_id", "version_author", "version_reading_time", "version_published_at", "version_subtitle", "version_excerpt", "version_badge", "version_cover_id", "version_body", "version_review_status", "version_review_note", "version_submitted_at", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_slug", "version_legacy_id", "version_author", "version_reading_time", "version_published_at", "version_subtitle", "version_excerpt", "version_badge", "version_cover_id", "version_body", "version_review_status", "version_review_note", "version_submitted_at", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_blog_v\`;`)
  await db.run(sql`DROP TABLE \`_blog_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__blog_v\` RENAME TO \`_blog_v\`;`)
  await db.run(sql`CREATE INDEX \`_blog_v_parent_idx\` ON \`_blog_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_slug_idx\` ON \`_blog_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_legacy_id_idx\` ON \`_blog_v\` (\`version_legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_cover_idx\` ON \`_blog_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_reviewed_by_idx\` ON \`_blog_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_folder_idx\` ON \`_blog_v\` (\`version_folder_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_updated_at_idx\` ON \`_blog_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_created_at_idx\` ON \`_blog_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version__status_idx\` ON \`_blog_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_created_at_idx\` ON \`_blog_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_updated_at_idx\` ON \`_blog_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_latest_idx\` ON \`_blog_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`__new_events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`date\` text,
  	\`end_date\` text,
  	\`time_label\` text,
  	\`location\` text DEFAULT 'Kennedyallee 18',
  	\`category\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`image_id\` integer,
  	\`description\` text,
  	\`body\` text,
  	\`slug\` text,
  	\`legacy_id\` numeric,
  	\`review_status\` text DEFAULT 'draft',
  	\`review_note\` text,
  	\`submitted_at\` text,
  	\`reviewed_by_id\` integer,
  	\`folder_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_events\`("id", "title", "date", "end_date", "time_label", "location", "category", "tag_color", "image_id", "description", "body", "slug", "legacy_id", "review_status", "review_note", "submitted_at", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status") SELECT "id", "title", "date", "end_date", "time_label", "location", "category", "tag_color", "image_id", "description", "body", "slug", "legacy_id", "review_status", "review_note", "submitted_at", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status" FROM \`events\`;`)
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`ALTER TABLE \`__new_events\` RENAME TO \`events\`;`)
  await db.run(sql`CREATE INDEX \`events_image_idx\` ON \`events\` (\`image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`events_slug_idx\` ON \`events\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`events_legacy_id_idx\` ON \`events\` (\`legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`events_reviewed_by_idx\` ON \`events\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`events_folder_idx\` ON \`events\` (\`folder_id\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`events__status_idx\` ON \`events\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__events_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_date\` text,
  	\`version_end_date\` text,
  	\`version_time_label\` text,
  	\`version_location\` text DEFAULT 'Kennedyallee 18',
  	\`version_category\` text,
  	\`version_tag_color\` text DEFAULT 'green',
  	\`version_image_id\` integer,
  	\`version_description\` text,
  	\`version_body\` text,
  	\`version_slug\` text,
  	\`version_legacy_id\` numeric,
  	\`version_review_status\` text DEFAULT 'draft',
  	\`version_review_note\` text,
  	\`version_submitted_at\` text,
  	\`version_reviewed_by_id\` integer,
  	\`version_folder_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__events_v\`("id", "parent_id", "version_title", "version_date", "version_end_date", "version_time_label", "version_location", "version_category", "version_tag_color", "version_image_id", "version_description", "version_body", "version_slug", "version_legacy_id", "version_review_status", "version_review_note", "version_submitted_at", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_date", "version_end_date", "version_time_label", "version_location", "version_category", "version_tag_color", "version_image_id", "version_description", "version_body", "version_slug", "version_legacy_id", "version_review_status", "version_review_note", "version_submitted_at", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_events_v\`;`)
  await db.run(sql`DROP TABLE \`_events_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__events_v\` RENAME TO \`_events_v\`;`)
  await db.run(sql`CREATE INDEX \`_events_v_parent_idx\` ON \`_events_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_image_idx\` ON \`_events_v\` (\`version_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_slug_idx\` ON \`_events_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_legacy_id_idx\` ON \`_events_v\` (\`version_legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_reviewed_by_idx\` ON \`_events_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_folder_idx\` ON \`_events_v\` (\`version_folder_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_updated_at_idx\` ON \`_events_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_created_at_idx\` ON \`_events_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version__status_idx\` ON \`_events_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_created_at_idx\` ON \`_events_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_updated_at_idx\` ON \`_events_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_latest_idx\` ON \`_events_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`review_status\` text DEFAULT 'draft',
  	\`review_note\` text,
  	\`submitted_at\` text,
  	\`reviewed_by_id\` integer,
  	\`folder_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages\`("id", "title", "slug", "review_status", "review_note", "submitted_at", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status") SELECT "id", "title", "slug", "review_status", "review_note", "submitted_at", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status" FROM \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages\` RENAME TO \`pages\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_reviewed_by_idx\` ON \`pages\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_folder_idx\` ON \`pages\` (\`folder_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_review_status\` text DEFAULT 'draft',
  	\`version_review_note\` text,
  	\`version_submitted_at\` text,
  	\`version_reviewed_by_id\` integer,
  	\`version_folder_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v\`("id", "parent_id", "version_title", "version_slug", "version_review_status", "version_review_note", "version_submitted_at", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_slug", "version_review_status", "version_review_note", "version_submitted_at", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v\` RENAME TO \`_pages_v\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_reviewed_by_idx\` ON \`_pages_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_folder_idx\` ON \`_pages_v\` (\`version_folder_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
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
  	\`users_id\` integer,
  	\`payload_folders_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_id\`) REFERENCES \`blog\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`permissions_id\`) REFERENCES \`permissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`roles_id\`) REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_folders_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "blog_id", "events_id", "pages_id", "media_id", "permissions_id", "roles_id", "users_id", "payload_folders_id") SELECT "id", "order", "parent_id", "path", "blog_id", "events_id", "pages_id", "media_id", "permissions_id", "roles_id", "users_id", "payload_folders_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_permissions_id_idx\` ON \`payload_locked_documents_rels\` (\`permissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_roles_id_idx\` ON \`payload_locked_documents_rels\` (\`roles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_folders_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_folders_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_preferences_rels\`("id", "order", "parent_id", "path", "users_id") SELECT "id", "order", "parent_id", "path", "users_id" FROM \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_preferences_rels\` RENAME TO \`payload_preferences_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  // Generated order fixed by hand: drop the new tables only after every table
  // referencing them is rebuilt, and turn foreign keys back on last.
  await db.run(sql`DROP TABLE \`payload_mcp_api_keys\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
}
