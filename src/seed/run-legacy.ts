import { upsertLegacyArticles } from './legacy'

/* Standalone runner: seeds the migrated Aktuelles articles (blog + events) into
   an existing DB. Stop the dev server first (it holds the SQLite lock).

     pnpm payload run src/seed/run-legacy.ts
*/
await upsertLegacyArticles()
