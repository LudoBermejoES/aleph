## Why

Characters, organizations, locations, wiki entities, and — as of the most recent change — quests can all be linked to each other through Aleph's generic relation system (`relation create/list/delete`, backed by the unified `entities` table). Sessions and arcs cannot: they live in their own `game_sessions`/`arcs` tables, never gained a mirror row in `entities`, and so a session or arc slug fails to resolve through `GET /api/campaigns/:id/entities/:slug` with "Entity not found" — the exact same gap quests had before `relatable-quests` closed it. This blocks a genuinely useful case: a session that should say "this session is where Julia met Otto" or "this arc takes place at The Keep" has no way to record that as a queryable relation, only as prose in its description/summary.

Once the code gap is closed, there is a second, larger opportunity: **decades of existing session and arc content already describe these relationships in prose** (session summaries, manual/AI notes, arc descriptions) but none of it is captured as relation edges. Closing the code gap without also walking the existing content back-fills nothing — the sessions and arcs that would benefit most (the ones with the richest history) are exactly the ones created before this feature existed.

## What Changes

- Give `game_sessions` and `arcs` rows a mirror row in `entities` (reusing `id` as `entities.id`, the same shared-id pattern `organizations` and — most recently — `quests` already use; no new FK column, no schema migration), so session and arc slugs resolve through the generic entity lookup and `relation create/list/delete` work on them with zero CLI/API code changes.
- Enforce campaign-wide slug uniqueness for both, via `ensureUniqueSlug` (already used by characters and, since the last change, quests), replacing the current bare `slugify()` with no collision check.
- Boot-time backfill (mirroring `server/db/backfills/quest-entities.ts`) so every existing session and arc — including the ~88 sessions and 12 arcs already in the Berlín en Tinieblas campaign — becomes relatable without recreating anything.
- Keep the mirror entity in sync on rename/visibility-relevant changes and clean it up (cascading any relations) on delete, matching the quest precedent.
- **Deploy this to production** (commit, push, confirm the boot-time backfill actually ran against the live server) — the code change alone does nothing until the campaigns people actually use have their mirror rows.
- **Populate relations from existing content**: once deployed, go through each session (and each arc) that has actual narrative content — session summaries/notes, arc descriptions — and create relations to the characters, locations, organizations, and quests that content actually mentions. This is a content task, not a code task, and it is the reason this change is worth doing at all: it turns prose that already exists into a queryable graph.

## Capabilities

### New Capabilities

- `session-relations`: Sessions can be looked up by slug through the generic entity resolver and linked to other entities (including other sessions, arcs, characters, locations, organizations, quests) via the existing relation system, exactly like characters, organizations, locations, and quests.
- `arc-relations`: Same, for arcs — including arc creation registering a mirror entity and getting a campaign-wide unique slug (arcs have no other existing spec whose requirements this naturally extends, unlike sessions, so it lives here rather than as a delta against the UI-focused `arcs-chapters-ui` spec).

### Modified Capabilities

- `session-management`: Session creation now also creates a backing `entities` row (type `session` — already seeded as a built-in entity type) and session slugs must be unique campaign-wide (not just among sessions).

## Impact

- **Data model**: no schema migration. `game_sessions.id` and `arcs.id` become shared with `entities.id` for their mirror rows, the same pattern quests use (see `openspec/changes/archive/2026-08-05-relatable-quests/design.md` for the precedent and its rejected alternatives).
- **Server API**: `sessions/index.post.ts`, `sessions/[slug]/index.put.ts`, `sessions/[slug]/index.delete.ts`, `arcs/index.post.ts`, `arcs/[slug]/index.put.ts`, `arcs/[slug]/index.delete.ts` — insert/sync/delete the mirror entity row. Relation endpoints are unaffected in code (same finding as quests: the validation is fully generic).
- **CLI (aleph-cli) — assessed per CLAUDE.md**: no command changes expected (relations already resolve any entity by slug); verify during implementation and update `docs/claude-skill.md` / `.claude/skills/aleph-cli/SKILL.md` to document that sessions and arcs are now relatable, same as the quest precedent.
- **Frontend**: no required changes. Whether the entity-graph visualization should render session/arc nodes is out of scope here (same open question already flagged for quests).
- **Content**: the population pass touches only `entity_relations` rows (via `relation create`) in the Berlín en Tinieblas campaign — no source markdown files are modified, and no existing data is deleted or overwritten.
