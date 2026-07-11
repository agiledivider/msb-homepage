# Backlog

Deferred work, newest first. Items tagged **🚨 GO-LIVE BLOCKER** must be resolved before the site is publicly reachable without the Basic Auth gate.

---

## 🚨 GO-LIVE BLOCKER — Public demo image ships real admin accounts with known passwords

**Status:** deferred to shortly before go-live (decided 2026-07-11)
**Severity:** Critical — full CMS takeover on the public demo
**Source:** code review #2 (2026-07-11), confirmed live against the baked DB

### The problem
The public demo (`msb-demo.idiot.games`) is reachable **without Basic Auth by default** and ships **four privileged accounts baked into the image with trivial dev passwords** — anyone can open `/admin` and log in as an editorial admin.

- `Dockerfile:60` bakes the git-tracked `demo-seed/demo.sqlite` into the image.
- `docker-compose.demo.yml:34-35` leaves `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` empty; `src/proxy.ts:25` (`if (!user || !pass) return NextResponse.next()`) then disables the gate → whole app + `/admin` public. (The compose comment even says "leave both unset for a public demo.")

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
3. **Force Basic Auth on for the demo** — set non-empty `BASIC_AUTH_*` in `docker-compose.demo.yml` so the gate is never bypassed.

At minimum: **never bake `falk@kuehnel.eu` / `test` with admin rights into a publicly reachable image.**

### Related follow-ups (not blockers, note while here)
- **Rotate** `test` / `changeme123` anywhere they are reused; treat the current baked `demo-seed/demo.sqlite` as compromised.
- `/api/media` is ungated by design (`src/proxy.ts:48` matcher excludes it) — uploaded assets, including covers on unpublished drafts, are fetchable by sequential id even with Basic Auth on. Separate, low severity.

---

## Notes from the same review (already resolved)
- ✅ #1 Draft/unpublished content publicly readable — fixed in `dcdbbc8` (`src/access/publicRead.ts`).
- ✅ #3 Day-only events bucketed by the current instant — fixed in `3dec150` (`startOfTodayBerlin` / Berlin-anchored queries).
