import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_donate\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'GELDSPENDE',
  	\`heading\` text DEFAULT 'So kannst du spenden',
  	\`intro\` text,
  	\`bank_holder\` text DEFAULT 'MakerSpace Bonn e.V.',
  	\`bank_bank_name\` text DEFAULT 'Sparkasse KölnBonn',
  	\`bank_iban\` text,
  	\`bank_bic\` text,
  	\`bank_reference\` text DEFAULT 'Spende MakerSpace Bonn',
  	\`paypal_url\` text,
  	\`betterplace_url\` text,
  	\`receipt\` text DEFAULT 'Bis 300 € reicht dem Finanzamt dein Kontoauszug als Nachweis. Für höhere Beträge stellen wir dir gern eine Zuwendungsbestätigung aus: Schreib uns mit Name und Anschrift an office@makerspacebonn.de.',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_donate_order_idx\` ON \`pages_blocks_donate\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_donate_parent_id_idx\` ON \`pages_blocks_donate\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_donate_path_idx\` ON \`pages_blocks_donate\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_donate\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tag\` text DEFAULT 'GELDSPENDE',
  	\`heading\` text DEFAULT 'So kannst du spenden',
  	\`intro\` text,
  	\`bank_holder\` text DEFAULT 'MakerSpace Bonn e.V.',
  	\`bank_bank_name\` text DEFAULT 'Sparkasse KölnBonn',
  	\`bank_iban\` text,
  	\`bank_bic\` text,
  	\`bank_reference\` text DEFAULT 'Spende MakerSpace Bonn',
  	\`paypal_url\` text,
  	\`betterplace_url\` text,
  	\`receipt\` text DEFAULT 'Bis 300 € reicht dem Finanzamt dein Kontoauszug als Nachweis. Für höhere Beträge stellen wir dir gern eine Zuwendungsbestätigung aus: Schreib uns mit Name und Anschrift an office@makerspacebonn.de.',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_donate_order_idx\` ON \`_pages_v_blocks_donate\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_donate_parent_id_idx\` ON \`_pages_v_blocks_donate\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_donate_path_idx\` ON \`_pages_v_blocks_donate\` (\`_path\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_donate\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_donate\`;`)
}
