# Design audit: homepage vs. Styleguide 2026-11 (draft)

**Date:** 2026-11-22 · **Styleguide:** `msb-styleguide` version 2026-11.10 (`src/template.html`, palette in `src/build.py`) · **Site:** dev server at the commit after `94d8710`, checked at 1440 px and 375 px in headless Chrome (Blink).
**Status:** findings only; the work is tracked in `docs/BACKLOG.md` → "E4 — Styleguide 2026-11".

## Verdict

The site implements the **February 2026** guide (`globals.css` names "Styleguide V2026-02-15"). The draft adopted several homepage ideas: the graph-paper background, the cutting-mat hero (exact match: 34 px grid, line `#49693D`, ruler `#98AB92`, ticks every 17 px) and the label tape. But almost every value the draft **changed** is still the old one on the site, and four explicit rules are broken: the fonts, white text on Markengrün, yellow used as a general accent, and AI images without a label. There is no dark mode, no focus-ring system, and about half the small text is below the 14 px web minimum. Most fixes are token changes in `@theme` plus one decision about fonts.

## Deviations

Severity: **must** = breaks an explicit styleguide rule or WCAG AA · **should** = old value or ignored recommendation · **nice** = polish. File references are as of 2026-11-22.

| # | Area | Styleguide (section) | Site | Sev | Fix |
|---|---|---|---|---|---|
| 1 | Text green | §5 Textgrün `#33791A` (replaces `#238811`, too weak on Creme) | `--color-brand-text` / `--color-green` = `#238811`, also hard-coded in `Hero/Component.tsx`. 3.90:1 on paper, 3.70:1 on fond, 3.99:1 on green-pale: **fails AA** (active nav, "alle Events →", list dates) | must | Tokens → `#33791a`; Hero hexes → token |
| 2 | White on Markengrün | §6 "Nicht so: Weiß auf Markengrün (2,69:1)"; §5 text on it always Tinte | Header CTA, footer CTA, green TapeTag, JoinOptions green card, opening-hours header, ViewSwitcher active, calendar "today", TopStrip "open" | must | Buttons: `#33791A` bg + white text, hover `#325725`. Tags/strips: Markengrün + Tinte text (6.32:1) |
| 3 | Fonts | §9 "IBM Plex Sans für alles, Montserrat nur im Logo"; §1 Schrift is a fixed brand element | Archivo 800/900 for all headings; Newsreader italic for ledes; Caveat for notes and polaroid captions | must | **Decision pending** (see backlog). Draft: Plex Sans Bold 700 for headings, Plex Sans Light 300 at 19–21 px for ledes |
| 4 | Handwriting | §10 real handwriting (scanned/tablet), no handwriting fonts for whole texts | Caveat for short notes ("Frisch dokumentiert", "über 40 Maschinen") and polaroid captions | should | Scanned/SVG handwriting for notes; Plex Mono label for captions |
| 5 | Body text | §5 Tinte `#1E1C19` | `--color-ink: #1a1a1a`; blog/event bodies `#332f28` | should | `--color-ink: #1e1c19`, bodies use `text-ink` |
| 6 | Secondary text | §5 Stein `#5F5850` | `muted #736e62` (4.34:1), `faint #9a9484` (**2.59:1**, metas, dates, footnotes), `#7c766a` ledes (3.86:1), plus `#595959`, `#54503f`, `#4c4a42` | must | One token `#5f5850` |
| 7 | Page background | Papier `#FBF8F2` | `--color-paper: #f1ede2` | should | `#fbf8f2` (also raises contrast of #1, #6) |
| 8 | Raster | Rastergrün `#EBF1DF`, 1 px / 27 px; fixed hex, no transparency | 27 px right, line `rgba(94,177,48,.1)` | should | Token `--color-raster: #ebf1df` |
| 9 | Schneidematte | Fixed hex; text Kreide `#EDE8DE`; button Kreide with Grün 800 text; preview radius 10 px | Colours via `rgba(255,255,255,.11/.5)`; radius 16 px; hero text white / white-80 / white-90; CTAs white with `#238811` or yellow | should | Hex tokens `#49693d` / `#98ab92`; Kreide text; Kreide CTA with Grün 800 text |
| 10 | Mitglieder-Gelb | §5 yellow = member content only, with "von …"; "Gelb = Mitglieder, Orange = Events. Nicht mischen" | `#fcbd30` for "NEU IM BLOG" badge, "Beitrag lesen" CTA, tape tags (prop `orange` renders yellow), event tags | must | Events/actions in Maker-Orange `#F2711C` with Tinte text (5.79:1); soft tags in Gelb-Fond `#FDF3D7` / Ocker `#8A5A00` |
| 11 | Sicherheitsrot | §5 `#C62828` only for safety, never decorative; §7 neutral status = Fläche + dashed border | TopStrip "geschlossen" is a full-width `#c0392b` bar (not a palette colour) | should | Closed: Grün 800 or Tinte with Kreide text; open: Markengrün with Tinte text. **Decided 2026-11-22 (Falk): closed stays red on purpose, now Sicherheitsrot `#C62828` with white text** |
| 12 | Creme | §5 Creme `#FAF2E4` for info boxes; `#F5E6C9` print only | `fond` / `sand` = `#f5e6c9` on web ("Neu hier?" boxes) with `#238811` text at 3.70:1 | must | Both → `#faf2e4` |
| 13 | Cards, lines | Fläche `#FFFFFF`, Linie `#E4DCCB` | Cards `#fffdf8` (token + ~10 hard-coded), `--color-line: #e0e0e0`, ~8 one-off hexes (`#fbf7ec`, `#e8d3a6`, `#efeadd`, `#ece7dd`, `#cfc9ba`, `#d9d2c1`, `#ece7db`, `#f6f2e8`) | should | Card `#ffffff`, line `#e4dccb`, one-offs → tokens |
| 14 | Green scale | Grün 50 `#F0F7EA`, 100 `#DCEFD0`, 300 `#9CD27D` | `green-pale #eaf3dd`, `green-mint #edf6e0`, `green-soft #cfe9ad` | nice | pale → `#f0f7ea`, soft → `#dcefd0`, drop mint |
| 15 | Header | Kopfleiste on Fläche with a line, no transparency | Translucent `rgba(244,241,233,.92)` + backdrop blur | nice | Opaque card + bottom line |
| 16 | Footer logo | §3 Negativ on Grün 800/900 | All-white logo on `#325725` | should | Negativ logo (green cube, white lettering) |
| 17 | Footer text | Kreide on Grün 800, links underlined | `#fff`, `#d7d2c4`, `#7f7a6d`; legal links and © at **1.94:1**, 12 px, not underlined | must | Kreide, ≥ 14 px, underlined |
| 18 | CTA band | Kreide button, Grün 800 text | White button, `#238811` text, white/60 outline, radius 18 px | nice | Kreide button and outline |
| 19 | Text size | §9 web never below 14 px | 11–13.5 px in tags, dates, TapeTag, TopStrip, hero pills, metas, footer, opening hours, footer CTA | must | 14 px floor |
| 20 | Labels | §9 Plex Mono Medium, caps, +6 % tracking; §10 label strip on Tinte or Markengrün | TapeTag 600, tracking .08em, 11.5 px, white on Markengrün; case mixed | should | Medium, `.06em`, caps, 14 px; white on Tinte or Tinte on Markengrün |
| 21 | Type scale | Titel 40–56 px / 1.05; Überschrift 28–32; Zwischenzeile 20 Medium; body 16–18 / 1.5 | h1 `clamp(30px,6vw,48px)` / 1.02 / −.02em; section h2 26 px; prose h2 20 px; prose h3 11.5 px grey mono; blog body 1.7 | should | Into the scale; prose h3 ≥ 20 px; body 1.5–1.6 |
| 22 | Links | §7 always underline links | "alle Events →", "Archiv →", footer and legal links not underlined | should | Underline text links outside nav and buttons |
| 23 | Focus | 3 px ring `#33791A`, 2 px offset | Only the map link has its own focus style; rest is browser default | should | Global `:focus-visible` ring |
| 24 | Targets, radii | Buttons/fields 44 px; target ≥ 44×44; radii 4–6 px buttons, 6–8 px cards (previews) | Header CTA ~41 px, hamburger 42, hero pills and pause 30, view switcher ~32; radii 9–22 px | should / nice | `min-h-11`; optional radius tokens |
| 25 | Sticker | §10 Maker-Orange circle, hard `3px 3px 0` Tinte shadow, max one per view | Hero badge: yellow pill, white border, soft shadow | nice | Sticker spec |
| 26 | Pegboard | §7 Raster: no dots; patterns only on Ebene 0 | Workshops block: dotted pegboard on `#e9dfc9` on top of the grid | nice | Plain, or add pegboard to the guide |
| 27 | Dark mode | Tannen palette (`#0C1511` / `#13201A` / `#213129`, Kreide text, green text `#9CD27D`, `#5EB130` button with Tinte text), toggle, `theme-color` metas, Negativ logo | None | should | Port `modi_css()` from `build.py`, add toggle and metas |
| 28 | AI images | §12 AI images only when labelled "Bild generiert" / "Bild bearbeitet" | Hero photos, event thumbnails (one AI image on all 5 events), AI-edited map: no label | must | Media field (none/generated/edited), label in Media and Polaroid; prefer real photos |
| 29 | Icons | §11 e.g. Lucide or Tabler, line style | Font Awesome solid (project rule) | nice | FA regular style, or name FA in the guide |
| 30 | Language | §13 German, "wir duzen" | English sub-ledes on every page ("Three weekends, one big cut…", footer "An open workshop for everyone.") | should | German, or `lang="en"` plus a rule in the guide |
| 31 | Naming | §4 "MakerSpace Bonn" | CMS alt text on the spieleabend image: "Makerspace Bonn" | nice | Fix in the CMS |
| 32 | Phone format | consistency | TopStrip "0228 81286980" vs. footer "+49 (228) 81 28 69 80" | nice | One format |
| 33 | Hero eyebrow, pills | palette values | Eyebrow `#cfe9ad` / `#fbe3a0` with rgba borders; pills inline `#238811`, `#7c766a`, `#fbf7ec`, `#eaf3dd` | should | Grün 300 `#9cd27d` or Kreide; pills via tokens |

**Unverified:** logo clear space and minimum sizes (the guide gives no web minimum; header logo 36 px, footer 48 px look fine); WebKit/iPhone rendering.

## Gaps to feed back into the styleguide

1. Heavier display headlines: Plex Sans stops at Bold 700; allow or forbid a heavier face.
2. English micro-copy: §13 has no rule.
3. Handwritten notes on the web: no workflow (SVG export, size, colour).
4. Polaroid frames with caption band and tape.
5. Pegboard (Lochwand) surface, which conflicts with "keine Punkte".
6. Full-width open/closed status strip (status colours only cover pills).
7. Carousel pills with progress bar; event date blocks.
8. Event category tags vs. "one accent per medium".
9. Corner-radius scale (shown in previews, never stated).
10. Icon library: guide suggests Lucide/Tabler, project mandates Font Awesome.
11. Map style: brand-green map with the signet as pin.
