import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog\` ADD \`last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`blog\` ADD \`last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`blog_last_edited_by_idx\` ON \`blog\` (\`last_edited_by_id\`);`)
  await db.run(sql`ALTER TABLE \`_blog_v\` ADD \`version_last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`_blog_v\` ADD \`version_last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_last_edited_by_idx\` ON \`_blog_v\` (\`version_last_edited_by_id\`);`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`events_last_edited_by_idx\` ON \`events\` (\`last_edited_by_id\`);`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_last_edited_by_idx\` ON \`_events_v\` (\`version_last_edited_by_id\`);`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`pages_last_edited_by_idx\` ON \`pages\` (\`last_edited_by_id\`);`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_last_edited_by_idx\` ON \`_pages_v\` (\`version_last_edited_by_id\`);`)
  await db.run(sql`ALTER TABLE \`workshops\` ADD \`last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`workshops\` ADD \`last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`workshops_last_edited_by_idx\` ON \`workshops\` (\`last_edited_by_id\`);`)
  await db.run(sql`ALTER TABLE \`_workshops_v\` ADD \`version_last_edited_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`_workshops_v\` ADD \`version_last_edited_via_claude\` integer;`)
  await db.run(sql`CREATE INDEX \`_workshops_v_version_version_last_edited_by_idx\` ON \`_workshops_v\` (\`version_last_edited_by_id\`);`)
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
  	\`created_by_id\` integer,
  	\`reviewed_by_id\` integer,
  	\`folder_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_blog\`("id", "title", "slug", "legacy_id", "author", "reading_time", "published_at", "subtitle", "excerpt", "badge", "cover_id", "body", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status") SELECT "id", "title", "slug", "legacy_id", "author", "reading_time", "published_at", "subtitle", "excerpt", "badge", "cover_id", "body", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status" FROM \`blog\`;`)
  await db.run(sql`DROP TABLE \`blog\`;`)
  await db.run(sql`ALTER TABLE \`__new_blog\` RENAME TO \`blog\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_slug_idx\` ON \`blog\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`blog_legacy_id_idx\` ON \`blog\` (\`legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_cover_idx\` ON \`blog\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_created_by_idx\` ON \`blog\` (\`created_by_id\`);`)
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
  	\`version_created_by_id\` integer,
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
  	FOREIGN KEY (\`version_created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__blog_v\`("id", "parent_id", "version_title", "version_slug", "version_legacy_id", "version_author", "version_reading_time", "version_published_at", "version_subtitle", "version_excerpt", "version_badge", "version_cover_id", "version_body", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_slug", "version_legacy_id", "version_author", "version_reading_time", "version_published_at", "version_subtitle", "version_excerpt", "version_badge", "version_cover_id", "version_body", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_blog_v\`;`)
  await db.run(sql`DROP TABLE \`_blog_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__blog_v\` RENAME TO \`_blog_v\`;`)
  await db.run(sql`CREATE INDEX \`_blog_v_parent_idx\` ON \`_blog_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_slug_idx\` ON \`_blog_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_legacy_id_idx\` ON \`_blog_v\` (\`version_legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_cover_idx\` ON \`_blog_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_created_by_idx\` ON \`_blog_v\` (\`version_created_by_id\`);`)
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
  	\`subtitle\` text,
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
  	\`created_by_id\` integer,
  	\`reviewed_by_id\` integer,
  	\`folder_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_events\`("id", "title", "subtitle", "date", "end_date", "time_label", "location", "category", "tag_color", "image_id", "description", "body", "slug", "legacy_id", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status") SELECT "id", "title", "subtitle", "date", "end_date", "time_label", "location", "category", "tag_color", "image_id", "description", "body", "slug", "legacy_id", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status" FROM \`events\`;`)
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`ALTER TABLE \`__new_events\` RENAME TO \`events\`;`)
  await db.run(sql`CREATE INDEX \`events_image_idx\` ON \`events\` (\`image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`events_slug_idx\` ON \`events\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`events_legacy_id_idx\` ON \`events\` (\`legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`events_created_by_idx\` ON \`events\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`events_reviewed_by_idx\` ON \`events\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`events_folder_idx\` ON \`events\` (\`folder_id\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`events__status_idx\` ON \`events\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__events_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_subtitle\` text,
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
  	\`version_created_by_id\` integer,
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
  	FOREIGN KEY (\`version_created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__events_v\`("id", "parent_id", "version_title", "version_subtitle", "version_date", "version_end_date", "version_time_label", "version_location", "version_category", "version_tag_color", "version_image_id", "version_description", "version_body", "version_slug", "version_legacy_id", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_subtitle", "version_date", "version_end_date", "version_time_label", "version_location", "version_category", "version_tag_color", "version_image_id", "version_description", "version_body", "version_slug", "version_legacy_id", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_events_v\`;`)
  await db.run(sql`DROP TABLE \`_events_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__events_v\` RENAME TO \`_events_v\`;`)
  await db.run(sql`CREATE INDEX \`_events_v_parent_idx\` ON \`_events_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_image_idx\` ON \`_events_v\` (\`version_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_slug_idx\` ON \`_events_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_legacy_id_idx\` ON \`_events_v\` (\`version_legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_created_by_idx\` ON \`_events_v\` (\`version_created_by_id\`);`)
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
  	\`created_by_id\` integer,
  	\`reviewed_by_id\` integer,
  	\`folder_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages\`("id", "title", "slug", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status") SELECT "id", "title", "slug", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "folder_id", "updated_at", "created_at", "_status" FROM \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages\` RENAME TO \`pages\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_by_idx\` ON \`pages\` (\`created_by_id\`);`)
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
  	\`version_created_by_id\` integer,
  	\`version_reviewed_by_id\` integer,
  	\`version_folder_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_folder_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v\`("id", "parent_id", "version_title", "version_slug", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_slug", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_folder_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v\` RENAME TO \`_pages_v\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_by_idx\` ON \`_pages_v\` (\`version_created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_reviewed_by_idx\` ON \`_pages_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_folder_idx\` ON \`_pages_v\` (\`version_folder_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`__new_workshops\` (
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
  await db.run(sql`INSERT INTO \`__new_workshops\`("id", "title", "slug", "order", "icon", "verbs", "summary", "promise", "cover_id", "cover_caption", "facts_where", "facts_hours", "facts_cost", "materials", "contact_name", "contact_role", "contact_photo_id", "contact_link_label", "contact_link_url", "contact_note", "cta_heading", "cta_text", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "updated_at", "created_at", "_status") SELECT "id", "title", "slug", "order", "icon", "verbs", "summary", "promise", "cover_id", "cover_caption", "facts_where", "facts_hours", "facts_cost", "materials", "contact_name", "contact_role", "contact_photo_id", "contact_link_label", "contact_link_url", "contact_note", "cta_heading", "cta_text", "review_status", "review_note", "submitted_at", "created_by_id", "reviewed_by_id", "updated_at", "created_at", "_status" FROM \`workshops\`;`)
  await db.run(sql`DROP TABLE \`workshops\`;`)
  await db.run(sql`ALTER TABLE \`__new_workshops\` RENAME TO \`workshops\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`workshops_slug_idx\` ON \`workshops\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`workshops_cover_idx\` ON \`workshops\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_contact_contact_photo_idx\` ON \`workshops\` (\`contact_photo_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_created_by_idx\` ON \`workshops\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_reviewed_by_idx\` ON \`workshops\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`workshops_updated_at_idx\` ON \`workshops\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`workshops_created_at_idx\` ON \`workshops\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`workshops__status_idx\` ON \`workshops\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__workshops_v\` (
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
  await db.run(sql`INSERT INTO \`__new__workshops_v\`("id", "parent_id", "version_title", "version_slug", "version_order", "version_icon", "version_verbs", "version_summary", "version_promise", "version_cover_id", "version_cover_caption", "version_facts_where", "version_facts_hours", "version_facts_cost", "version_materials", "version_contact_name", "version_contact_role", "version_contact_photo_id", "version_contact_link_label", "version_contact_link_url", "version_contact_note", "version_cta_heading", "version_cta_text", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_slug", "version_order", "version_icon", "version_verbs", "version_summary", "version_promise", "version_cover_id", "version_cover_caption", "version_facts_where", "version_facts_hours", "version_facts_cost", "version_materials", "version_contact_name", "version_contact_role", "version_contact_photo_id", "version_contact_link_label", "version_contact_link_url", "version_contact_note", "version_cta_heading", "version_cta_text", "version_review_status", "version_review_note", "version_submitted_at", "version_created_by_id", "version_reviewed_by_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_workshops_v\`;`)
  await db.run(sql`DROP TABLE \`_workshops_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__workshops_v\` RENAME TO \`_workshops_v\`;`)
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
}
