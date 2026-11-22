import { z } from 'zod'
import raw from './legacy-archive.json'
import type { LegacyArticle } from './legacy-articles'

/* -------------------------------------------------------------------------
   The rest of the old Joomla "Aktuelles" archive (2017–2026), imported on
   2026-11-22 next to the hand-migrated articles in legacy-articles.ts.

   legacy-archive.json is generated, not hand-edited: the old pages were
   scraped, sorted into events and blog posts (with each event's real date,
   not its publish date) and reviewed by hand. Opening-hours notices
   ("Pfingstmontag geschlossen!") and the old static pages were left out;
   their old links redirect via src/lib/legacy-paths.json. Images are in
   uploads/legacy/archive-*. Recipe and counts: docs/legacy-archive.md.
   ------------------------------------------------------------------------- */

const iso = z.string().datetime({ offset: true })
const block = z.union([
  z.object({ p: z.string() }).strict(),
  z.object({ h2: z.string() }).strict(),
  z.object({ ul: z.array(z.string()) }).strict(),
  z.object({ img: z.string(), alt: z.string().optional() }).strict(),
])
const base = {
  legacyId: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  image: z.string().optional(),
  body: z.array(block),
}
const article = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('blog'), ...base, publishedAt: iso }).strict(),
  z
    .object({
      kind: z.literal('event'),
      ...base,
      date: iso,
      endDate: iso.optional(),
      timeLabel: z.string().optional(),
      category: z.string().optional(),
      tagColor: z.enum(['green', 'orange', 'neutral']),
    })
    .strict(),
])

export const legacyArchive: LegacyArticle[] = z.array(article).parse(raw)
