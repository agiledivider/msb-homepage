---
name: ideas-to-backlog
description: Turn the raw ideas in docs/IDEAS.md into backlog stories in docs/BACKLOG.md. USE WHEN Falk says "turn ideas into backlog items", "ideas to backlog", "move the ideas to the backlog", or /ideas-to-backlog.
---

# Ideas → backlog

Falk asked for this 4× in three days (2026-11-20 … 22). Same steps every time:

1. **Read** `docs/IDEAS.md` and the rules at the top of `docs/BACKLOG.md` (legend, sizes, rules).
2. **Only take items under `# New Ideas`.** Everything under `# Ideas for later` stays untouched: those are reminders, not work.
3. **Per idea, decide** (say which, in one line each):
   - fits an existing epic → new story there, next free ID (`S<epic>.<n>`);
   - several ideas share a theme no epic covers → new epic `## E<n> — <name>` with a one-line goal and `**Status:** proposed <date>`;
   - already covered by a story → just say which one and drop the idea;
   - unclear what Falk means → ask (numbered questions, max 3) before writing anything.
4. **Write each story in the backlog format**:
   ```
   ### ⏳ S<e>.<n> — <user-visible outcome, as a sentence> (S|M|L)
   <problem, 1–3 sentences. Who is affected and why it matters.>

   **AC:** <user-visible acceptance criteria; mention 375 px if it touches layout>
   ```
   Intent only: no file paths, no chosen approach, no implementation notes. Vertical slices only; split anything bigger than L. Use `**Needs:** <ID>` for real dependencies.
5. **Remove the moved ideas** from `# New Ideas` (keep the section header and its comments).
6. **Run `pnpm backlog:summary`** (`pnpm test` fails on a stale summary).
7. **Report** in ≤ 10 lines: new IDs with titles, ideas you merged or dropped, open questions. Don't commit: editing BACKLOG.md needs Falk's fresh confirmation (global STOP gate), so show the result and ask.
