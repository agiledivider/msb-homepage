# Old Joomla archive import

On 2026-11-22 the rest of the old "Aktuelles" archive from `makerspacebonn.de` was imported: every article id the July inventory (`legacy-articles-inventory.tsv`) listed below 341, plus the new ids 375–381. Ids 341–374 had been migrated by hand earlier (`src/seed/legacy-articles.ts`) and stay as they are.

## What came out of it

| | count | where it goes |
|---|---|---|
| events | 191 | `events`, dated by the event day (read from title and text), not the publish day |
| blog posts | 74 | `blog`: reports, news, greetings, calls, the 2020 Corona project pages |
| opening-hours notices | 54 | not imported (Falk 2026-11-22); old links → `/blog` |
| old static pages | 16 | not imported (the new site has its own); old links → the matching new page |

Images: 183, resized to at most 1600 px and stripped of metadata, in `uploads/legacy/archive-*`. The first image of an article is its cover; the others stay in the text as image nodes. Articles without an image in the text get their Joomla *intro image* as cover: Joomla shows it only in the old list views (homepage, `view=category&layout=blog&id=<cat>&start=<n>` with 7 per page, and `view=archive`), never on the article page, so it is collected from those (`scripts/legacy-archive/intro.json`). 111 articles, mostly 2021–2024, have no image anywhere on the old site. 9 images only existed on the old WordPress image proxy and are gone; 6 WordPress emoji were dropped.

## Files

- `src/seed/legacy-archive.json`: the articles (generated, don't edit by hand); loaded and checked by `src/seed/legacy-archive.ts`
- `src/lib/legacy-paths.json`: old id → new path for every archived or skipped id (generated); used by the proxy and by `publish:static`
- `scripts/legacy-archive/`: the generator
  - `parse.py`: downloaded article pages → JSON (blocks, images, dates)
  - `classify.py`: first-pass event/blog guess and event date
  - `overrides.py`: the hand review (notice/blog/event lists, event dates, times, ranges): the decisions live here
  - `intro.json`: article id → intro image, from the list views
  - `build.py`: writes the two JSON files and the resized images
- `tests/unit/legacy-archive.test.ts`: ids, slugs, redirects and image files stay consistent

## Re-running

Only needed if the old site changes again. Download each article page (`https://makerspacebonn.de/index.php?view=article&id=<id>`, one request per second) into a scratch folder `raw/<id>.html`, the image URLs into `img/`, then:

```bash
python3 -I scripts/legacy-archive/parse.py <scratch>/raw <scratch>/articles.json
python3 -I scripts/legacy-archive/classify.py <scratch>/articles.json <scratch>/class.tsv
# review class.tsv, record decisions in overrides.py, copy it next to the scratch tools
python3 -I scripts/legacy-archive/build.py <scratch> .
pnpm lint:fix                             # Biome formats the generated JSON
pnpm payload run src/seed/run-legacy.ts   # dev server stopped
```

`build.py` expects `articles.json`, `class.tsv`, `img-urls.json`, `img/`, `tools/overrides.py` and `tools/intro.json` in the scratch folder.

## Filing into folders

`src/seed/run-file-folders.ts` files every event under `Events / <year> / <month>` (event date) and every blog post under `Blog / <year> / <month>` (publish date, Berlin time), and moves along the images that belong to exactly one of them. Dry run by default, `FILE_FOLDERS_APPLY=1` applies; run it after an import. New and edited events and posts without a folder are filed the same way on save by `src/plugins/autofile`; a folder an editor picks is kept, and the runner only catches up on content from before the plugin.
