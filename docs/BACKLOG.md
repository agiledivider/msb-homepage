# Backlog

Deferred work, newest first. Items tagged **🚨 GO-LIVE BLOCKER** must be resolved before the site is publicly reachable.

> **The Basic Auth gate no longer exists** (removed 2026-07-22). `src/proxy.ts` now only
> does the legacy 301s, and `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` are gone from the
> compose files and env examples. Any deployment of the Payload image is therefore public
> the moment it has a URL — there is no longer a fallback gate to hide behind, which makes
> the blocker below unconditional rather than "only when the gate is off".

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

`isAdmin` keys off `editorialRoles: ['admin']` (`src/plugins/editorial/access.ts:17`), which unlocks Users/Roles/Permissions → account #2 is a full admin.

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
