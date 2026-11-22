# Backlog

Deferred work, newest first. Items tagged **🚨 GO-LIVE BLOCKER** must be resolved before the site is publicly reachable.

> **The Basic Auth gate no longer exists** (removed 2026-07-22). `src/proxy.ts` now only
> does the legacy 301s, and `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` are gone from the
> compose files and env examples. Any deployment of the Payload image is therefore public
> the moment it has a URL — there is no longer a fallback gate to hide behind, which makes
> the blocker below unconditional rather than "only when the gate is off".

---

## Styleguide 2026-11 (design audit 2026-11-22)

**Status:** proposed 2026-11-22. The site still follows the February 2026 styleguide. Findings, values and severities: `docs/design-audit-2026-11.md`.

### All text on the site is readable
**Problem:** green link text, grey secondary text and the footer's small print fail WCAG AA contrast (down to 1.94:1); main buttons put white text on Markengrün, which the styleguide shows as a "Nicht so" example; much small text is 11–13.5 px.
**Desired:** every text and background pairing meets the styleguide's contrast roles (Textgrün, Stein, Tinte, Kreide on dark green), buttons use the styleguide's button colours, and no text on the web is smaller than 14 px.
**AC:** on start, a page, blog, a post, events and the archive, at 1440 px and 375 px, an automated contrast check reports no AA failures; no rendered text is below 14 px; the layout at 375 px still fits without horizontal scrolling.

### The site uses the new styleguide palette and accents
**Problem:** background, cards, lines, info boxes, grid and cutting mat use old or translucent colours; Mitglieder-Gelb is used as a general highlight; the "closed" strip uses a red that is reserved for safety.
**Desired:** every surface uses a named colour from the 2026-11 palette (no ad-hoc hexes, no transparency); yellow appears only on member content, events and actions use Maker-Orange; open/closed status uses calm status colours, not Sicherheitsrot.
**AC:** side-by-side with the styleguide, background, cards, lines, info boxes, grid and mat show the documented values; no yellow outside member content; a fitness test fails when a colour hex is written outside the design tokens.

### Headings and intros use the brand typeface
**Status:** decided 2026-11-22: headlines keep Archivo (Plex Sans tops out at 700 and loses the hero's punch); the styleguide session was asked to add Archivo as an allowed display face. Still open: Newsreader intros and Caveat notes.
**Problem:** headings use Archivo Black, intros Newsreader italic and notes the Caveat font, while the styleguide says "IBM Plex Sans für alles" and lists the typeface as a fixed brand element.
**Desired:** headings, intros, labels and captions follow the styleguide's type scale and label style; either Plex Sans only, or a heavier heading face that the styleguide then explicitly allows.
**AC:** every page uses only the typefaces the styleguide allows; headings and body sizes are within its scale; the hero prism's motion is unchanged.

### Keyboard and touch users can find and hit every control
**Problem:** focus is only visible as the browser default; many buttons and pills are 30–42 px tall; several text links aren't underlined.
**Desired:** a clear focus ring in the styleguide's style on every interactive element, touch targets of at least 44 × 44 px, and underlined text links outside navigation and buttons.
**AC:** tabbing through each page shows the ring on every control; no button, pill or switch is smaller than 44 px; text links outside nav and buttons are underlined.

### Visitors can tell which images are AI-generated
**Problem:** hero photos, event thumbnails and the location map are AI-generated or AI-edited, but the styleguide requires such images to be labelled and they aren't.
**Desired:** editors mark an image as "generated" or "edited" in the CMS, and the site shows the styleguide's label ("Bild generiert" / "Bild bearbeitet") wherever that image appears.
**AC:** a marked image shows its label in every place it appears, including polaroid frames and the static export; unmarked images show nothing; existing AI images are marked.

### Visitors can switch the site to dark mode
**Problem:** the styleguide now defines a dark "Tannen" palette, but the site has none.
**Desired:** the site follows the visitor's system setting, offers a toggle that is remembered, and uses the styleguide's dark palette and Negativ logo.
**AC:** with the system set to dark, every page renders in the Tannen palette and passes the same contrast check as light; the toggle overrides the system setting and survives a reload; the browser bar colour matches.

### Footer, logo and wording follow the styleguide
**Problem:** the footer shows the all-white logo instead of the Negativ variant; pages carry English sub-ledes although the guide says German; the phone number appears in two formats; one image text spells "Makerspace Bonn".
**Desired:** the footer uses the Negativ logo, visible copy is German (or English is a deliberate, marked exception), and names and numbers are written one way everywhere.
**AC:** footer shows the Negativ logo; no unmarked English copy on any page; one phone format; "MakerSpace Bonn" spelled correctly everywhere.

### Feed site patterns back into the styleguide
**Problem:** the site has patterns the styleguide doesn't cover (polaroids, pegboard, status strip, carousel pills, event tags, radius scale, icon library, map style, English copy), and two of them conflict with it.
**Desired:** the styleguide team decides on each pattern: adopt it into the guide or drop it from the site.
**AC:** each gap listed in the audit has a decision recorded in the styleguide or in this backlog.

---

## From IDEAS.md (2026-11-21)

**Status:** proposed 2026-11-21.

### Editors choose which events appear in the start-page carousel
**Problem:** the carousel's event slide always shows the next upcoming event, whatever it is. Editors can't keep a routine or minor event out of the banner, or let a more important one take its place.
**Desired:** each event has a "show in the carousel" option, switched on by default. The carousel shows the next upcoming event that has it switched on; switched-off events still appear in the event lists and on the events page.
**AC:** an editor switches the option off for the next event, and the carousel shows the next event that has it on, while the switched-off event is still in the upcoming list; new events and existing events nobody edits behave exactly as today.

### Visitors buy tickets or register on the event page
**Problem:** events that need registration or a ticket only say so in the text, so visitors have to go somewhere else (mail, another site) to sign up.
**Desired:** an editor can link an event to its pretix shop or event, and the event page then shows the pretix order form, so visitors register or buy right there. Events without a pretix link look as they do today. This also works on the statically published site.
**AC:** an editor adds a pretix event to an event, and on the published page a visitor can complete an order without leaving the site; an event without pretix shows no form; the Datenschutzerklärung covers pretix before it goes live.

### People apply for membership on the website
**Status:** decided 2026-11-21: the application itself lives in the Vereinssoftware (its S1.34). The homepage only leads there. **Needs:** Vereinssoftware S1.34 live at a public address.
**Problem:** there's no way to apply for membership online. Applications arrive on paper or by mail and have to be typed into the Vereinssoftware by hand.
**Desired:** visitors who want to join find a clear way from the homepage (at least on "Mitmachen") to the online application in the Vereinssoftware. While online applications are switched off, the homepage doesn't offer them and says how to join instead.
**AC:** from "Mitmachen", a visitor reaches the online application in one click and can apply there; editors can change the link and its text in the CMS; with no link set, the page shows the offline way to join instead of a broken link.

### ✅ DONE 2026-11-22 — Editors create content by asking Claude
**Implementation notes:** `@payloadcms/plugin-mcp` at `/api/mcp` (`0ed742f`); editors connect their own Claude with a personal key (Verwaltung → KI-Zugänge) that acts as their CMS user. MCP writes are forced to drafts (`mcpDraftOnly`), no deletes; `uploadMedia` adds images/PDFs by URL or base64 (public at once, marked "Von Claude hochgeladen"). New "Erstellt von" on blog, events, pages. Verified by Falk on staging. Details and the known gap (a key keeps its owner's roles from their last login) in `docs/CLAUDE-MCP.md`.

**Problem:** writing a blog post or entering an event means working through the CMS forms by hand, even when the content already exists elsewhere (a mail, a flyer, notes).
**Desired:** an editor can ask Claude to create or update blog posts, events and pages in the CMS. Claude works with the editor's own rights and only creates drafts, which go through the normal review and approval before anything is published.
**AC:** an editor asks Claude to create an event from a flyer text, and the event appears in the CMS as a draft under the editor's name; Claude cannot publish or approve anything, and cannot do anything the editor's own account couldn't; without a valid login it can do nothing.

---

## From IDEAS.md (2026-11-20)

**Status:** proposed 2026-11-20.

### Editors can set every label on the homepage carousel and lists
**Status:** the implementation needs a design discussion with Falk before work starts.
**Problem:** the blog and event slides in the start-page carousel, and the lists next to it, show labels and tags that editors can't change. Some are fixed texts in the code, some are derived automatically. Every event slide says "kostenlos", for example, even for paid events, and the small eyebrow, note and button texts are the same for every post and event.
**Desired:** every label and tag a visitor sees on a blog or event slide, and on its entry in the homepage lists, can be set per post or event. When left empty, it falls back to today's sensible default.
**AC:** an editor changes each visible label on one event and one blog post and sees the change in the hero preview and on the start page; a paid event no longer shows "kostenlos"; posts and events nobody edits look exactly as they do today.

### 🚨 GO-LIVE BLOCKER — Site content survives a lost server
**Problem:** all content (the CMS database and uploaded media) lives only on the server's Docker volumes. There is no backup, so a broken disk, a bad migration or an accidental delete loses everything editors have written.
**Desired:** content and media are backed up automatically on a regular schedule to a place off the server, old backups are kept for a while, and a documented restore brings a fresh server back to the state of the last backup.
**AC:** a backup runs without anyone triggering it; a restore onto an empty stack from the latest backup shows the same pages, posts, events and images; someone is notified when a backup fails.

---

## Before launch (2026-11-20)

**Status:** proposed 2026-11-20 from the pre-launch review. Not blockers on their own, but should land before the site goes public. Two existing items also belong on this list: **Lint is green and stays green** and **Every push runs the gate in CI** (under "Playbook retrofit gaps"), and the redirect story below draws on the legacy migration section.

### Search engines find and present every page well
**Problem:** the site has no `robots.txt` and no sitemap, and normal content pages show no page-specific title or description in search results or link previews (blog posts and events do).
**Desired:** search engines get a robots file and a sitemap of every public page, post and event; every public page has its own title and description, and sharing a link shows a sensible preview.
**AC:** `/robots.txt` and `/sitemap.xml` load on the live site and in the static bundle; the sitemap lists a newly published page and leaves out drafts; a page like `/verein` shows its own title in the browser tab and in a link preview.

### The Verein has checked the legal pages
**Problem:** Impressum and Datenschutzerklärung were written as a baseline by the developers. Nobody responsible for the Verein has confirmed they're correct, and the privacy statement must describe what the live site actually does.
**Desired:** the Vorstand (or whoever they name) has reviewed both pages against the live setup and signed them off.
**AC:** the reviewer confirms in writing that Impressum and Datenschutzerklärung are correct for the launch setup; any corrections are live.

### The most-visited old links still work
**Problem:** about 328 old Joomla articles were never imported (see "Legacy migration is incomplete" below), so links from other sites and search engines lead to a 404 at launch.
**Desired:** at least the old addresses that still get real visits lead to the matching new page, or to a fitting overview.
**AC:** a list of the most-visited old addresses exists, and each of them opens a useful page on the new site instead of a 404.

### The site goes live on its real domain and is watched
**Problem:** launch still needs things outside the code: the real domain and certificates, a production Kanidm login, a strong emergency admin login, a first database setup on the production server, and someone noticing when the site is down.
**Desired:** the site runs on its real domain over HTTPS; editors log in through the production Kanidm; a local emergency admin with a strong password exists and is stored safely; the production database was created by the migrations; an uptime check alerts someone when the site or the CMS stops responding.
**AC:** the real domain serves the site with a valid certificate; an editor logs in through Kanidm in production; the emergency admin can log in; stopping the site triggers an alert within minutes.

---

## Security audit 2026-11-20

**Status:** proposed 2026-11-20. The critical dependency advisories were fixed the same day (Payload 3.93, Next 16.4.6, `9822cc3`); these items are what's left.

### ✅ DONE 2026-11-20 — Removing someone in Kanidm removes their CMS access
**Implementation notes:** roles are overwritten at every Kanidm login; a missing `cms_roles` claim (Kanidm omits it when the user is in no role group) means no roles. Logins without `email_verified: true` are refused (`src/plugins/oidc/claims.ts`). Covered by `tests/integration/kanidm-login.test.ts`, which drives the real payload-oauth2 callback with Kanidm faked at `fetch`. Verified by Falk with a real Kanidm login. Caveats in `DEPLOY.md`: a wrong claim name strips Kanidm users' roles (keep the local password admin), and removal takes effect at the next login, not immediately.

**Problem:** a person taken out of every CMS role group in Kanidm keeps the CMS roles they had before, as long as they can still log in. A Kanidm login also attaches to an existing CMS account with the same email address, even when Kanidm hasn't verified that address. A blocker only if Kanidm sign-in is part of the launch, which is the plan.
**Desired:** CMS rights always follow Kanidm group membership at login, and a Kanidm identity only takes over an existing account through a verified email address.
**AC:** a user removed from all role groups has no CMS rights after their next login; a login with an unverified email never lands in an existing account; a user whose roles change in Kanidm sees the change at their next login.

### The publish service only accepts authenticated requests and runs unprivileged
**Problem:** the publish service accepts every request when its shared token is not configured, and its container runs as root while holding the registry token and the deploy key.
**Desired:** the service refuses to start without a token, checks it in constant time, and runs as an unprivileged user.
**AC:** starting the publisher without a token fails with a clear message; a request with a wrong or missing token gets 401; the publisher container's process is not root.

### Admin and public site send security headers
**Problem:** neither the CMS nor the static site sends security headers, so other sites can frame the admin (clickjacking) and browsers get no HSTS, `nosniff` or CSP.
**Desired:** both deployments send a sensible baseline of security headers that doesn't break the admin, live preview or the hero.
**AC:** a header scan of `/admin` and of the static site shows frame protection, HSTS, `nosniff` and a CSP; admin, live preview and the start page still work.

### Small hardening follow-ups
**Problem:** several small gaps:
- the draft-preview link can be made to redirect to another site;
- a hanging Kanidm server hangs the login request;
- a failed Kanidm login writes the token server's response into the log;
- a real production env file isn't covered by `.gitignore`.

**Desired:** preview only redirects within the site; Kanidm calls give up after a few seconds; login-failure logs contain only status and error code; no real env file can be committed by accident.
**AC:** `/next/preview?path=//example.com` is rejected; a login against an unreachable Kanidm fails within seconds; `git status` ignores a new `.env.production`.

---

## Playbook retrofit gaps

**Status:** proposed 2026-11-12 (gaps against the playbook's TypeScript starter checklist). Not go-live blockers.

### Lint is green and stays green
**Problem:** `pnpm lint` reports 20 errors and 7 warnings (mostly `noArrayIndexKey`, `noNonNullAssertion`, `noImgElement`), so the fast check can't tell new problems from old ones.
**Desired:** zero errors and warnings; anything deliberately allowed is an explicit, commented Biome override.
**AC:** `pnpm lint` exits 0 on a clean checkout.

### Every push runs the gate in CI
**Problem:** CI only builds and pushes images; lint, typecheck, tests and a vulnerability scan never run, and actions are pinned by tag.
**Desired:** a CI job runs lint, typecheck, tests and a container/dependency scan (Trivy) on every push to `main`, images are only pushed when it is green, actions are pinned by SHA, and dependency updates arrive as PRs (Renovate) plus a scheduled audit.
**AC:** a red test blocks the image push; the Actions tab shows the scan result.
**Note (2026-11-20):** `pnpm audit --prod` still reports 2 high advisories in `happy-dom`. Only the HTML-to-Lexical converter uses it, and the app never calls that converter. The fix needs happy-dom 21, which Lexical doesn't allow yet. The scheduled audit should show them clearing.

### Stricter TypeScript catches missing data
**Problem:** `tsconfig.json` lacks `noUncheckedIndexedAccess`, `noImplicitOverride` and `verbatimModuleSyntax` (explicitly `false`).
**Desired:** the playbook strict flags are on, with existing errors fixed.
**AC:** `pnpm typecheck` passes with the flags enabled.

### Commits and edits are checked locally
**Problem:** no git hooks: no Conventional-Commit / no-AI-trailer check, no pre-commit lint, no Biome-on-edit hook for Claude.
**Desired:** `pnpm setup:hooks` installs the playbook's `commit-msg` and `pre-commit` hooks; `.claude/settings.json` runs Biome on edited files.
**AC:** a commit with a bad subject or an AI trailer is rejected locally.

### One command proves "done"
**Problem:** the gate is four commands with no evidence file; there are no `qa`, `deps:check`, `deps:update` or `security:scan` scripts, and no supply-chain delay for new package versions (pnpm `minimumReleaseAge`).
**Desired:** `pnpm qa` runs the full gate and writes a summary file; deps and security scripts exist; new releases wait a day before install.
**AC:** `pnpm qa` exits non-zero on any failing stage and leaves `summary.json`.

### Key user journeys are covered end to end
**Problem:** no e2e tests; hero, navigation, events views and the static bundle are only checked by hand.
**Desired:** Playwright-in-Docker e2e for the public site (start page hero, blog/event detail, events views, legacy 301s) and for the static `dist/` bundle.
**AC:** `pnpm test:e2e` runs in Docker and is part of the gate.

### Images are reproducible
**Problem:** Dockerfiles use floating tags (`node:22-slim`, `nginx:1.27-alpine`).
**Desired:** base images pinned by digest and updated by Renovate.
**AC:** rebuilding the same commit yields the same base layers.

---

## Legacy migration is incomplete — ~328 old Joomla articles were never imported

**Status:** postponed (2026-07-22). Scope decision needed before any work starts.
**Impact:** old inbound links 404. Not a go-live blocker, but it is SEO/link rot.

### What's actually there
The old Joomla site (`makerspacebonn.de`) is **still online**, and the redirect map only
covers what was migrated: `legacyId` **341–374** (34 articles, in
`src/seed/legacy-articles.ts`). Everything older 404s — e.g. the reported
`/index.php?view=article&id=335:workshop-schmuck-und-patches-am-23-06&catid=10`.

Probing `/index.php?view=article&id=N` for N in 1–400 (missing ids return a clean 404)
found **362 live articles**, spanning 2017–2026:

| year | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|---|
| articles | 1 | 57 | 59 | 55 | 42 | 60 | 31 | 28 | 22 | 6 |

Full id → date → title list: [`legacy-articles-inventory.tsv`](legacy-articles-inventory.tsv)
(regenerate by re-probing; don't re-scan casually, it's ~360 requests against their live site).

Note the category listing (`?option=com_content&view=category&id=10`) shows only 33 of
these, so it is **not** a reliable inventory — it omits most older items.

### Scope options
1. **Close the recent gap (~320–340)** — ~15 articles, 2024, contiguous with what exists.
   Small enough to hand-check; covers the links people still follow.
2. **Migrate everything (~328 missing)** — full archive back to 2017. Best link
   preservation, but a large automated scrape (bodies, images, dates) with real risk of
   mangled formatting, and it would roughly 10x the events collection with long-past events.
3. **Redirect-only** — map unmigrated ids to `/events/archiv` so links land somewhere
   instead of 404-ing. No content recovered.
4. **Recent gap + redirect the rest.**

Whichever is chosen, `scripts/publish-static.ts` builds the nginx/Apache redirect rules
from the DB automatically, so no redirect code needs touching — only the seed data.

---

## 🚨 GO-LIVE BLOCKER — Public demo image ships real admin accounts with known passwords

**Status:** exposure removed 2026-07-22 — `msb-demo.idiot.games` now serves the **static** site (no Node, no DB, no `/admin`), so there is nothing there to log into. Closes once the host is redeployed from the new `ghcr.io/agiledivider/msb-demo` image.
**Severity:** was Critical (full CMS takeover on the public demo)
**Source:** code review #2 (2026-07-11), confirmed live against the baked DB

### The problem
The public demo used to ship **four privileged accounts baked into the image with trivial dev passwords** — anyone could open `/admin` and log in as an editorial admin.

- `Dockerfile:60` (the `demo` target) bakes `demo-seed/demo.sqlite` into the image.
- Nothing gates it: since the Basic Auth removal (2026-07-22) any Payload deployment is public by construction.

### Still outstanding
The *deployment* is fixed, not the artifact. Before any Payload image is exposed again:

- The `demo` target in `Dockerfile` and `scripts/prepare-demo-seed.sh` still produce an image with those accounts — nothing deploys it today, but it's a loaded gun on the shelf.
- Previously pushed CMS images remain pullable **by digest** even though `msb-demo:latest` now points at the static site.
- Rotate `test` / `changeme123` wherever they are reused; treat the existing `demo-seed/demo.sqlite` as compromised.

Baked accounts (verified from `demo-seed/demo.sqlite`):

| id | email | editorialRoles | RBAC roles | password | source |
|----|-------|----------------|-----------|----------|--------|
| 1 | admin@makerspacebonn.de | editor | Administrator | `changeme123` | `src/seed/index.ts:51` default |
| 2 | **falk@kuehnel.eu** | **admin** | Administrator + Redakteur | `test` | `src/seed/index.ts:66` |
| 3 | editor@test.de | editor | Redakteur | `test` | `src/seed/roles.ts` |
| 4 | reviewer@test.de | reviewer | Administrator | `test` | `src/seed/roles.ts` |

> **Note (updated 2026-07-24):** the `editorialRoles` field was removed — roles are
> now unified on RBAC. `isAdmin` keys off the `editorial:admin` RBAC permission
> (`src/plugins/editorial/access.ts`), and test users are seeded by `src/seed/rbac.ts`
> (the old `src/seed/roles.ts` is gone). The "editorialRoles" / roles.ts columns above
> are historical. Account #2 (falk = Administrator) is still a full admin.

### Fix options (pick one, or combine)
1. **Dedicated demo seed** — build the demo DB from a seed that creates a single demo account with a random (or disabled/read-only) password, instead of `sqlite3 .backup` of the dev DB (`scripts/prepare-demo-seed.sh`). *Preferred.*
2. **Strip/rotate users before baking** — in `scripts/prepare-demo-seed.sh`, after the backup, delete/rotate all `users` rows and their `users_rels`/`users_editorial_roles` so no real credentials ship.
3. **Don't expose the demo at all** — keep it on a private network / VPN, or serve the
   statically published site (`docs/STATIC.md`) instead, which contains no `/admin` at all.

At minimum: **never bake `falk@kuehnel.eu` / `test` with admin rights into a publicly reachable image.**

### Related follow-ups (not blockers, note while here)
- **Rotate** `test` / `changeme123` anywhere they are reused; treat the current baked `demo-seed/demo.sqlite` as compromised.
- `/api/media` is public by design — uploaded assets, including covers on unpublished drafts, are fetchable by sequential id. Separate, low severity. (The static bundle only ships media the published pages reference, so it isn't affected.)

---

## Notes from the same review (already resolved)
- ✅ #1 Draft/unpublished content publicly readable — fixed in `dcdbbc8` (`src/access/publicRead.ts`).
- ✅ #3 Day-only events bucketed by the current instant — fixed in `3dec150` (`startOfTodayBerlin` / Berlin-anchored queries).
- ✅ M1 `submit` transition bypassed RBAC — now gated by the collection's own update access (`transition.ts` `canUpdate`).
- ✅ MISSED-3 Review fields were UI-`readOnly` only — now locked to reviewers at the data layer via field `access.update` (`fields.ts`).
- ✅ M2 Basic Auth `atob` threw a 500 on malformed base64 — wrapped in try/catch → 401 challenge (`proxy.ts`).
