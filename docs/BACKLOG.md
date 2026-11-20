# Backlog

Deferred work, newest first. Items tagged **🚨 GO-LIVE BLOCKER** must be resolved before the site is publicly reachable.

> **The Basic Auth gate no longer exists** (removed 2026-07-22). `src/proxy.ts` now only
> does the legacy 301s, and `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` are gone from the
> compose files and env examples. Any deployment of the Payload image is therefore public
> the moment it has a URL — there is no longer a fallback gate to hide behind, which makes
> the blocker below unconditional rather than "only when the gate is off".

---

## Security audit 2026-11-20

**Status:** proposed 2026-11-20. The critical dependency advisories were fixed the same day (Payload 3.93, Next 16.4.6, `9822cc3`); these items are what's left.

### 🚨 GO-LIVE BLOCKER — Removing someone in Kanidm removes their CMS access
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
