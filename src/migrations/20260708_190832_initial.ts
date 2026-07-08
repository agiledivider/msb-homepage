import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_editorial_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_editorial_roles_order_idx\` ON \`users_editorial_roles\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_editorial_roles_parent_idx\` ON \`users_editorial_roles\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`users_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`roles_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`roles_id\`) REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_rels_order_idx\` ON \`users_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_parent_idx\` ON \`users_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_path_idx\` ON \`users_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_roles_id_idx\` ON \`users_rels\` (\`roles_id\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_thumbnail_url\` text,
  	\`sizes_thumbnail_width\` numeric,
  	\`sizes_thumbnail_height\` numeric,
  	\`sizes_thumbnail_mime_type\` text,
  	\`sizes_thumbnail_filesize\` numeric,
  	\`sizes_thumbnail_filename\` text,
  	\`sizes_card_url\` text,
  	\`sizes_card_width\` numeric,
  	\`sizes_card_height\` numeric,
  	\`sizes_card_mime_type\` text,
  	\`sizes_card_filesize\` numeric,
  	\`sizes_card_filename\` text,
  	\`sizes_hero_url\` text,
  	\`sizes_hero_width\` numeric,
  	\`sizes_hero_height\` numeric,
  	\`sizes_hero_mime_type\` text,
  	\`sizes_hero_filesize\` numeric,
  	\`sizes_hero_filename\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`media\` (\`sizes_thumbnail_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_hero_sizes_hero_filename_idx\` ON \`media\` (\`sizes_hero_filename\`);`)
  await db.run(sql`CREATE TABLE \`blog\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
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
  	\`reviewed_by_id\` integer,
  	\`submitted_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_slug_idx\` ON \`blog\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`blog_cover_idx\` ON \`blog\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_reviewed_by_idx\` ON \`blog\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_updated_at_idx\` ON \`blog\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_created_at_idx\` ON \`blog\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`blog__status_idx\` ON \`blog\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_blog_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
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
  	\`version_reviewed_by_id\` integer,
  	\`version_submitted_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`blog\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_blog_v_parent_idx\` ON \`_blog_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_slug_idx\` ON \`_blog_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_cover_idx\` ON \`_blog_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_reviewed_by_idx\` ON \`_blog_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_updated_at_idx\` ON \`_blog_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version_created_at_idx\` ON \`_blog_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_version_version__status_idx\` ON \`_blog_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_created_at_idx\` ON \`_blog_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_updated_at_idx\` ON \`_blog_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_blog_v_latest_idx\` ON \`_blog_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`date\` text,
  	\`end_date\` text,
  	\`time_label\` text,
  	\`location\` text DEFAULT 'Kennedyallee 18',
  	\`category\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`image_id\` integer,
  	\`description\` text,
  	\`body\` text,
  	\`review_status\` text DEFAULT 'draft',
  	\`review_note\` text,
  	\`reviewed_by_id\` integer,
  	\`submitted_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`events_slug_idx\` ON \`events\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`events_image_idx\` ON \`events\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`events_reviewed_by_idx\` ON \`events\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`events__status_idx\` ON \`events\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_events_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_date\` text,
  	\`version_end_date\` text,
  	\`version_time_label\` text,
  	\`version_location\` text DEFAULT 'Kennedyallee 18',
  	\`version_category\` text,
  	\`version_tag_color\` text DEFAULT 'green',
  	\`version_image_id\` integer,
  	\`version_description\` text,
  	\`version_body\` text,
  	\`version_review_status\` text DEFAULT 'draft',
  	\`version_review_note\` text,
  	\`version_reviewed_by_id\` integer,
  	\`version_submitted_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_events_v_parent_idx\` ON \`_events_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_slug_idx\` ON \`_events_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_image_idx\` ON \`_events_v\` (\`version_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_reviewed_by_idx\` ON \`_events_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_updated_at_idx\` ON \`_events_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_created_at_idx\` ON \`_events_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version__status_idx\` ON \`_events_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_created_at_idx\` ON \`_events_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_updated_at_idx\` ON \`_events_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_latest_idx\` ON \`_events_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_faces_meta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_hero_faces\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_faces_meta_order_idx\` ON \`pages_blocks_hero_faces_meta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_faces_meta_parent_id_idx\` ON \`pages_blocks_hero_faces_meta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_faces\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`badge\` text,
  	\`note\` text,
  	\`accent\` text DEFAULT 'green',
  	\`variant\` text DEFAULT 'standard',
  	\`eyebrow\` text,
  	\`pill_label\` text,
  	\`corner_label\` text,
  	\`event_day\` text,
  	\`event_month\` text,
  	\`event_weekday\` text,
  	\`headline\` text,
  	\`lede\` text,
  	\`description\` text,
  	\`primary_style\` text DEFAULT 'white',
  	\`primary_label\` text,
  	\`primary_url\` text,
  	\`secondary_label\` text,
  	\`secondary_url\` text,
  	\`image_id\` integer,
  	\`image_placeholder\` text,
  	\`caption\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_faces_order_idx\` ON \`pages_blocks_hero_faces\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_faces_parent_id_idx\` ON \`pages_blocks_hero_faces\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_faces_image_idx\` ON \`pages_blocks_hero_faces\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_order_idx\` ON \`pages_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_parent_id_idx\` ON \`pages_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_path_idx\` ON \`pages_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_page_intro\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`meta\` text,
  	\`headline\` text,
  	\`lede\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_page_intro_order_idx\` ON \`pages_blocks_page_intro\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_page_intro_parent_id_idx\` ON \`pages_blocks_page_intro\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_page_intro_path_idx\` ON \`pages_blocks_page_intro\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_event_feed_events\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`day\` text,
  	\`sub\` text,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`title\` text,
  	\`text\` text,
  	\`link_label\` text,
  	\`link_url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_event_feed\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_event_feed_events_order_idx\` ON \`pages_blocks_event_feed_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_event_feed_events_parent_id_idx\` ON \`pages_blocks_event_feed_events\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_event_feed_sidebar_hours\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`day\` text,
  	\`note\` text,
  	\`time\` text,
  	\`highlight\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_event_feed\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_event_feed_sidebar_hours_order_idx\` ON \`pages_blocks_event_feed_sidebar_hours\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_event_feed_sidebar_hours_parent_id_idx\` ON \`pages_blocks_event_feed_sidebar_hours\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_event_feed\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag_label\` text DEFAULT 'PINNWAND',
  	\`heading\` text DEFAULT 'Was läuft',
  	\`all_link_label\` text,
  	\`all_link_url\` text,
  	\`sidebar_hours_title\` text DEFAULT 'Öffnungszeiten',
  	\`sidebar_hours_badge\` text DEFAULT 'DIESE WOCHE',
  	\`sidebar_hours_footnote\` text,
  	\`sidebar_info_eyebrow\` text DEFAULT 'NEU HIER?',
  	\`sidebar_info_text\` text,
  	\`sidebar_info_link_label\` text,
  	\`sidebar_info_link_url\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_event_feed_order_idx\` ON \`pages_blocks_event_feed\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_event_feed_parent_id_idx\` ON \`pages_blocks_event_feed\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_event_feed_path_idx\` ON \`pages_blocks_event_feed\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_workshops_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`code\` text,
  	\`title\` text,
  	\`desc\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_workshops_items_order_idx\` ON \`pages_blocks_workshops_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_workshops_items_parent_id_idx\` ON \`pages_blocks_workshops_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_workshops\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`variant\` text DEFAULT 'preview',
  	\`tag_label\` text,
  	\`tag_color\` text DEFAULT 'orange',
  	\`heading\` text,
  	\`all_link_label\` text,
  	\`all_link_url\` text,
  	\`note\` text,
  	\`footnote\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_workshops_order_idx\` ON \`pages_blocks_workshops\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_workshops_parent_id_idx\` ON \`pages_blocks_workshops\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_workshops_path_idx\` ON \`pages_blocks_workshops\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_cta_band\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`text\` text,
  	\`primary_label\` text,
  	\`primary_url\` text,
  	\`secondary_label\` text,
  	\`secondary_url\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_band_order_idx\` ON \`pages_blocks_cta_band\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_band_parent_id_idx\` ON \`pages_blocks_cta_band\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_band_path_idx\` ON \`pages_blocks_cta_band\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_verein_intro_timeline\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`year\` text,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_verein_intro\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_verein_intro_timeline_order_idx\` ON \`pages_blocks_verein_intro_timeline\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_verein_intro_timeline_parent_id_idx\` ON \`pages_blocks_verein_intro_timeline\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_verein_intro_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_verein_intro\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_verein_intro_values_order_idx\` ON \`pages_blocks_verein_intro_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_verein_intro_values_parent_id_idx\` ON \`pages_blocks_verein_intro_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_verein_intro\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`body\` text,
  	\`quote\` text,
  	\`timeline_title\` text DEFAULT 'DIE KURZE GESCHICHTE',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_verein_intro_order_idx\` ON \`pages_blocks_verein_intro\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_verein_intro_parent_id_idx\` ON \`pages_blocks_verein_intro\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_verein_intro_path_idx\` ON \`pages_blocks_verein_intro\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_events_list_events\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`day\` text,
  	\`sub\` text,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`time\` text,
  	\`title\` text,
  	\`text\` text,
  	\`link_label\` text,
  	\`link_url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_events_list\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_events_list_events_order_idx\` ON \`pages_blocks_events_list_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_events_list_events_parent_id_idx\` ON \`pages_blocks_events_list_events\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_events_list_sidebar_big_events\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`meta\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_events_list\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_events_list_sidebar_big_events_order_idx\` ON \`pages_blocks_events_list_sidebar_big_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_events_list_sidebar_big_events_parent_id_idx\` ON \`pages_blocks_events_list_sidebar_big_events\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_events_list\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`sidebar_big_title\` text DEFAULT 'GRÖSSERE EVENTS',
  	\`sidebar_info_title\` text DEFAULT 'Neu hier?',
  	\`sidebar_info_text\` text,
  	\`sidebar_info_link_label\` text,
  	\`sidebar_info_link_url\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_events_list_order_idx\` ON \`pages_blocks_events_list\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_events_list_parent_id_idx\` ON \`pages_blocks_events_list\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_events_list_path_idx\` ON \`pages_blocks_events_list\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_join_options_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`number\` text,
  	\`eyebrow\` text,
  	\`tint\` text DEFAULT 'light',
  	\`title\` text,
  	\`text\` text,
  	\`link_label\` text,
  	\`link_url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_join_options\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_join_options_options_order_idx\` ON \`pages_blocks_join_options_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_join_options_options_parent_id_idx\` ON \`pages_blocks_join_options_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_join_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`location_eyebrow\` text DEFAULT 'SO FINDEST DU UNS',
  	\`location_title\` text DEFAULT 'Kennedyallee 18',
  	\`location_line\` text,
  	\`location_transit\` text,
  	\`location_map_id\` integer,
  	\`location_map_placeholder\` text DEFAULT 'Karte / Foto vom Eingang',
  	\`block_name\` text,
  	FOREIGN KEY (\`location_map_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_join_options_order_idx\` ON \`pages_blocks_join_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_join_options_parent_id_idx\` ON \`pages_blocks_join_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_join_options_path_idx\` ON \`pages_blocks_join_options\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_join_options_location_location_map_idx\` ON \`pages_blocks_join_options\` (\`location_map_id\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`review_status\` text DEFAULT 'draft',
  	\`review_note\` text,
  	\`reviewed_by_id\` integer,
  	\`submitted_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_reviewed_by_idx\` ON \`pages\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero_faces_meta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_hero_faces\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_faces_meta_order_idx\` ON \`_pages_v_blocks_hero_faces_meta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_faces_meta_parent_id_idx\` ON \`_pages_v_blocks_hero_faces_meta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero_faces\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`badge\` text,
  	\`note\` text,
  	\`accent\` text DEFAULT 'green',
  	\`variant\` text DEFAULT 'standard',
  	\`eyebrow\` text,
  	\`pill_label\` text,
  	\`corner_label\` text,
  	\`event_day\` text,
  	\`event_month\` text,
  	\`event_weekday\` text,
  	\`headline\` text,
  	\`lede\` text,
  	\`description\` text,
  	\`primary_style\` text DEFAULT 'white',
  	\`primary_label\` text,
  	\`primary_url\` text,
  	\`secondary_label\` text,
  	\`secondary_url\` text,
  	\`image_id\` integer,
  	\`image_placeholder\` text,
  	\`caption\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_faces_order_idx\` ON \`_pages_v_blocks_hero_faces\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_faces_parent_id_idx\` ON \`_pages_v_blocks_hero_faces\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_faces_image_idx\` ON \`_pages_v_blocks_hero_faces\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_order_idx\` ON \`_pages_v_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_parent_id_idx\` ON \`_pages_v_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_path_idx\` ON \`_pages_v_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_page_intro\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`meta\` text,
  	\`headline\` text,
  	\`lede\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_page_intro_order_idx\` ON \`_pages_v_blocks_page_intro\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_page_intro_parent_id_idx\` ON \`_pages_v_blocks_page_intro\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_page_intro_path_idx\` ON \`_pages_v_blocks_page_intro\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_event_feed_events\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`day\` text,
  	\`sub\` text,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`title\` text,
  	\`text\` text,
  	\`link_label\` text,
  	\`link_url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_event_feed\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_event_feed_events_order_idx\` ON \`_pages_v_blocks_event_feed_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_event_feed_events_parent_id_idx\` ON \`_pages_v_blocks_event_feed_events\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_event_feed_sidebar_hours\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`day\` text,
  	\`note\` text,
  	\`time\` text,
  	\`highlight\` integer,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_event_feed\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_event_feed_sidebar_hours_order_idx\` ON \`_pages_v_blocks_event_feed_sidebar_hours\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_event_feed_sidebar_hours_parent_id_idx\` ON \`_pages_v_blocks_event_feed_sidebar_hours\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_event_feed\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tag_label\` text DEFAULT 'PINNWAND',
  	\`heading\` text DEFAULT 'Was läuft',
  	\`all_link_label\` text,
  	\`all_link_url\` text,
  	\`sidebar_hours_title\` text DEFAULT 'Öffnungszeiten',
  	\`sidebar_hours_badge\` text DEFAULT 'DIESE WOCHE',
  	\`sidebar_hours_footnote\` text,
  	\`sidebar_info_eyebrow\` text DEFAULT 'NEU HIER?',
  	\`sidebar_info_text\` text,
  	\`sidebar_info_link_label\` text,
  	\`sidebar_info_link_url\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_event_feed_order_idx\` ON \`_pages_v_blocks_event_feed\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_event_feed_parent_id_idx\` ON \`_pages_v_blocks_event_feed\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_event_feed_path_idx\` ON \`_pages_v_blocks_event_feed\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_workshops_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`code\` text,
  	\`title\` text,
  	\`desc\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_workshops\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_workshops_items_order_idx\` ON \`_pages_v_blocks_workshops_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_workshops_items_parent_id_idx\` ON \`_pages_v_blocks_workshops_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_workshops\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`variant\` text DEFAULT 'preview',
  	\`tag_label\` text,
  	\`tag_color\` text DEFAULT 'orange',
  	\`heading\` text,
  	\`all_link_label\` text,
  	\`all_link_url\` text,
  	\`note\` text,
  	\`footnote\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_workshops_order_idx\` ON \`_pages_v_blocks_workshops\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_workshops_parent_id_idx\` ON \`_pages_v_blocks_workshops\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_workshops_path_idx\` ON \`_pages_v_blocks_workshops\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_cta_band\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`text\` text,
  	\`primary_label\` text,
  	\`primary_url\` text,
  	\`secondary_label\` text,
  	\`secondary_url\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_band_order_idx\` ON \`_pages_v_blocks_cta_band\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_band_parent_id_idx\` ON \`_pages_v_blocks_cta_band\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_band_path_idx\` ON \`_pages_v_blocks_cta_band\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_verein_intro_timeline\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`year\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_verein_intro\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_verein_intro_timeline_order_idx\` ON \`_pages_v_blocks_verein_intro_timeline\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_verein_intro_timeline_parent_id_idx\` ON \`_pages_v_blocks_verein_intro_timeline\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_verein_intro_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_verein_intro\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_verein_intro_values_order_idx\` ON \`_pages_v_blocks_verein_intro_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_verein_intro_values_parent_id_idx\` ON \`_pages_v_blocks_verein_intro_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_verein_intro\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`body\` text,
  	\`quote\` text,
  	\`timeline_title\` text DEFAULT 'DIE KURZE GESCHICHTE',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_verein_intro_order_idx\` ON \`_pages_v_blocks_verein_intro\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_verein_intro_parent_id_idx\` ON \`_pages_v_blocks_verein_intro\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_verein_intro_path_idx\` ON \`_pages_v_blocks_verein_intro\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_events_list_events\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`day\` text,
  	\`sub\` text,
  	\`tag\` text,
  	\`tag_color\` text DEFAULT 'green',
  	\`time\` text,
  	\`title\` text,
  	\`text\` text,
  	\`link_label\` text,
  	\`link_url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_events_list\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_events_list_events_order_idx\` ON \`_pages_v_blocks_events_list_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_events_list_events_parent_id_idx\` ON \`_pages_v_blocks_events_list_events\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_events_list_sidebar_big_events\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`meta\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_events_list\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_events_list_sidebar_big_events_order_idx\` ON \`_pages_v_blocks_events_list_sidebar_big_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_events_list_sidebar_big_events_parent_id_idx\` ON \`_pages_v_blocks_events_list_sidebar_big_events\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_events_list\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`sidebar_big_title\` text DEFAULT 'GRÖSSERE EVENTS',
  	\`sidebar_info_title\` text DEFAULT 'Neu hier?',
  	\`sidebar_info_text\` text,
  	\`sidebar_info_link_label\` text,
  	\`sidebar_info_link_url\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_events_list_order_idx\` ON \`_pages_v_blocks_events_list\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_events_list_parent_id_idx\` ON \`_pages_v_blocks_events_list\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_events_list_path_idx\` ON \`_pages_v_blocks_events_list\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_join_options_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`number\` text,
  	\`eyebrow\` text,
  	\`tint\` text DEFAULT 'light',
  	\`title\` text,
  	\`text\` text,
  	\`link_label\` text,
  	\`link_url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_join_options\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_join_options_options_order_idx\` ON \`_pages_v_blocks_join_options_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_join_options_options_parent_id_idx\` ON \`_pages_v_blocks_join_options_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_join_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`location_eyebrow\` text DEFAULT 'SO FINDEST DU UNS',
  	\`location_title\` text DEFAULT 'Kennedyallee 18',
  	\`location_line\` text,
  	\`location_transit\` text,
  	\`location_map_id\` integer,
  	\`location_map_placeholder\` text DEFAULT 'Karte / Foto vom Eingang',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`location_map_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_join_options_order_idx\` ON \`_pages_v_blocks_join_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_join_options_parent_id_idx\` ON \`_pages_v_blocks_join_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_join_options_path_idx\` ON \`_pages_v_blocks_join_options\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_join_options_location_location_map_idx\` ON \`_pages_v_blocks_join_options\` (\`location_map_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_review_status\` text DEFAULT 'draft',
  	\`version_review_note\` text,
  	\`version_reviewed_by_id\` integer,
  	\`version_submitted_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_reviewed_by_idx\` ON \`_pages_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`permissions_conditions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`field\` text,
  	\`operator\` text DEFAULT 'equals',
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`permissions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`permissions_conditions_order_idx\` ON \`permissions_conditions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`permissions_conditions_parent_id_idx\` ON \`permissions_conditions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`permissions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`type\` text DEFAULT 'single',
  	\`name\` text,
  	\`collection_name\` text,
  	\`create\` integer DEFAULT false,
  	\`read\` integer DEFAULT false,
  	\`update\` integer DEFAULT false,
  	\`delete\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`permissions_name_idx\` ON \`permissions\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`permissions_updated_at_idx\` ON \`permissions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`permissions_created_at_idx\` ON \`permissions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`roles\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`roles_name_idx\` ON \`roles\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`roles_updated_at_idx\` ON \`roles\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`roles_created_at_idx\` ON \`roles\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`roles_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`permissions_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`permissions_id\`) REFERENCES \`permissions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`roles_rels_order_idx\` ON \`roles_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`roles_rels_parent_idx\` ON \`roles_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`roles_rels_path_idx\` ON \`roles_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`roles_rels_permissions_id_idx\` ON \`roles_rels\` (\`permissions_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`blog_id\` integer,
  	\`events_id\` integer,
  	\`pages_id\` integer,
  	\`permissions_id\` integer,
  	\`roles_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_id\`) REFERENCES \`blog\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`permissions_id\`) REFERENCES \`permissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`roles_id\`) REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_permissions_id_idx\` ON \`payload_locked_documents_rels\` (\`permissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_roles_id_idx\` ON \`payload_locked_documents_rels\` (\`roles_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`hero_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`badge\` text DEFAULT 'SEIT 2018',
  	\`note\` text DEFAULT 'Hilfe zur Selbsthilfe ✦',
  	\`eyebrow\` text DEFAULT '◆ OFFENE WERKSTATT · BONN',
  	\`pill_label\` text DEFAULT 'WERKSTATT',
  	\`accent\` text DEFAULT 'green',
  	\`corner_label\` text DEFAULT '45°',
  	\`headline\` text DEFAULT 'Bau, was du dir
  vorstellst.' NOT NULL,
  	\`lede\` text DEFAULT 'A place to make things — for everyone in Bonn.',
  	\`description\` text DEFAULT 'Löten, schweißen, fräsen, nähen, 3D-drucken. Sechs Werkstätten, über 40 Maschinen und eine Community, die mit anpackt.',
  	\`primary_style\` text DEFAULT 'white',
  	\`primary_label\` text,
  	\`primary_url\` text,
  	\`secondary_label\` text,
  	\`secondary_url\` text,
  	\`image_id\` integer,
  	\`image_placeholder\` text DEFAULT 'Foto: Maker bei der Arbeit',
  	\`caption\` text DEFAULT 'Werkstatt · Kennedyallee 18',
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`hero_settings_image_idx\` ON \`hero_settings\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_nav\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_nav_order_idx\` ON \`site_settings_nav\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_nav_parent_id_idx\` ON \`site_settings_nav\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_footer_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_footer_links_order_idx\` ON \`site_settings_footer_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_footer_links_parent_id_idx\` ON \`site_settings_footer_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`top_strip_status\` text DEFAULT '● GEÖFFNET · HEUTE 18:00–21:00 UHR',
  	\`top_strip_address\` text DEFAULT 'Kennedyallee 18 · 53175 Bonn · Tel 0228 81286980',
  	\`header_cta_label\` text,
  	\`header_cta_url\` text,
  	\`footer_tagline\` text,
  	\`footer_contact\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_editorial_roles\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`users_rels\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`blog\`;`)
  await db.run(sql`DROP TABLE \`_blog_v\`;`)
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`DROP TABLE \`_events_v\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero_faces_meta\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero_faces\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_page_intro\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_event_feed_events\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_event_feed_sidebar_hours\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_event_feed\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_workshops_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_workshops\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_cta_band\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_verein_intro_timeline\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_verein_intro_values\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_verein_intro\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_events_list_events\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_events_list_sidebar_big_events\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_events_list\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_join_options_options\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_join_options\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero_faces_meta\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero_faces\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_page_intro\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_event_feed_events\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_event_feed_sidebar_hours\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_event_feed\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_workshops_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_workshops\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_cta_band\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_verein_intro_timeline\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_verein_intro_values\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_verein_intro\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_events_list_events\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_events_list_sidebar_big_events\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_events_list\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_join_options_options\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_join_options\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`permissions_conditions\`;`)
  await db.run(sql`DROP TABLE \`permissions\`;`)
  await db.run(sql`DROP TABLE \`roles\`;`)
  await db.run(sql`DROP TABLE \`roles_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`hero_settings\`;`)
  await db.run(sql`DROP TABLE \`site_settings_nav\`;`)
  await db.run(sql`DROP TABLE \`site_settings_footer_links\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
}
