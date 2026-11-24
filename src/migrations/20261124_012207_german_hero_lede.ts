import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_hero_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`eyebrow\` text DEFAULT '◆ OFFENE WERKSTATT · BONN',
  	\`accent\` text DEFAULT 'green',
  	\`headline\` text DEFAULT 'Bau, was du dir
  vorstellst.' NOT NULL,
  	\`lede\` text DEFAULT 'Ein Ort zum Selbermachen — für alle in Bonn.',
  	\`description\` text DEFAULT 'Löten, schweißen, fräsen, nähen, 3D-drucken. Sechs Werkstätten, über 40 Maschinen und eine Community, die mit anpackt.',
  	\`primary_label\` text,
  	\`primary_url\` text,
  	\`primary_style\` text DEFAULT 'white',
  	\`secondary_label\` text,
  	\`secondary_url\` text,
  	\`image_id\` integer,
  	\`caption\` text DEFAULT 'Werkstatt · Kennedyallee 18',
  	\`image_placeholder\` text DEFAULT 'Foto: Maker bei der Arbeit',
  	\`badge\` text DEFAULT 'SEIT 2018',
  	\`note\` text DEFAULT 'Hilfe zur Selbsthilfe ✦',
  	\`corner_label\` text DEFAULT '45°',
  	\`pill_label\` text DEFAULT 'WERKSTATT',
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_hero_settings\`("id", "eyebrow", "accent", "headline", "lede", "description", "primary_label", "primary_url", "primary_style", "secondary_label", "secondary_url", "image_id", "caption", "image_placeholder", "badge", "note", "corner_label", "pill_label", "updated_at", "created_at") SELECT "id", "eyebrow", "accent", "headline", "lede", "description", "primary_label", "primary_url", "primary_style", "secondary_label", "secondary_url", "image_id", "caption", "image_placeholder", "badge", "note", "corner_label", "pill_label", "updated_at", "created_at" FROM \`hero_settings\`;`)
  await db.run(sql`DROP TABLE \`hero_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_hero_settings\` RENAME TO \`hero_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`hero_settings_image_idx\` ON \`hero_settings\` (\`image_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_hero_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`eyebrow\` text DEFAULT '◆ OFFENE WERKSTATT · BONN',
  	\`accent\` text DEFAULT 'green',
  	\`headline\` text DEFAULT 'Bau, was du dir
  vorstellst.' NOT NULL,
  	\`lede\` text DEFAULT 'A place to make things — for everyone in Bonn.',
  	\`description\` text DEFAULT 'Löten, schweißen, fräsen, nähen, 3D-drucken. Sechs Werkstätten, über 40 Maschinen und eine Community, die mit anpackt.',
  	\`primary_label\` text,
  	\`primary_url\` text,
  	\`primary_style\` text DEFAULT 'white',
  	\`secondary_label\` text,
  	\`secondary_url\` text,
  	\`image_id\` integer,
  	\`caption\` text DEFAULT 'Werkstatt · Kennedyallee 18',
  	\`image_placeholder\` text DEFAULT 'Foto: Maker bei der Arbeit',
  	\`badge\` text DEFAULT 'SEIT 2018',
  	\`note\` text DEFAULT 'Hilfe zur Selbsthilfe ✦',
  	\`corner_label\` text DEFAULT '45°',
  	\`pill_label\` text DEFAULT 'WERKSTATT',
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_hero_settings\`("id", "eyebrow", "accent", "headline", "lede", "description", "primary_label", "primary_url", "primary_style", "secondary_label", "secondary_url", "image_id", "caption", "image_placeholder", "badge", "note", "corner_label", "pill_label", "updated_at", "created_at") SELECT "id", "eyebrow", "accent", "headline", "lede", "description", "primary_label", "primary_url", "primary_style", "secondary_label", "secondary_url", "image_id", "caption", "image_placeholder", "badge", "note", "corner_label", "pill_label", "updated_at", "created_at" FROM \`hero_settings\`;`)
  await db.run(sql`DROP TABLE \`hero_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_hero_settings\` RENAME TO \`hero_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`hero_settings_image_idx\` ON \`hero_settings\` (\`image_id\`);`)
}
