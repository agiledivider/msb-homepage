import { upsertLegalPages } from './legal'

/* Standalone runner: (re)creates the legal pages (Impressum, Datenschutz,
   Haftung) on an existing DB without touching the rest of the seed. Stop the
   dev server first (it holds the SQLite lock).

     pnpm payload run src/seed/run-legal.ts
*/
await upsertLegalPages()
