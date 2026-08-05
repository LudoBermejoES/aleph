## Why

Quests live in their own `quests` table (`server/db/schema/sessions.ts`), separate from the unified `entities` table that backs characters, organizations, locations and generic wiki pages. The relation system (`relation create` CLI, `POST /api/campaigns/:id/relations`) only resolves slugs against `entities`, so quests cannot be linked to anything — including each other — through it. A DM who creates a main quest and 8 sub-quests and tries `relation create --source <sub-quest> --target <main-quest> --forward "es parte de" --reverse "incluye la sub-misión"` gets `Error: Entity not found` for every sub-quest, because the CLI's `resolveEntitySlug` calls `GET /api/campaigns/:id/entities/:slug`, which only ever queries the `entities` table.

Notably, `entity_types` already seeds a built-in `quest` type (`server/services/entity-types.ts`, slug `quest`, icon `flag`, sortOrder 7) alongside `character`, `location`, `faction`, etc. — the type taxonomy anticipated quests being first-class entities, but the actual quest CRUD (`server/api/campaigns/[id]/quests/`) was implemented against a standalone table that never got wired into `entities`. Closing that gap lets quests participate in the same relation graph as everything else, using the same CLI/API surface DMs already know.

Separately, quests already have a `parentQuestId` column and full parent/sub-quest UI support (quest detail page, quest list tree, `diagram-generator.ts`), which the user did not expect to exist. That mechanism only expresses a single untyped "is a sub-quest of" edge and is not exposed by `aleph quest create`/`update` in the CLI at all — it is orthogonal to, not a substitute for, generic relations (which carry custom labels, attitude, visibility, and support quest-to-non-quest links like "questgiver" or "takes place in").

## What Changes

- Make quests participate in the generic `entities` table so relation-system slug resolution (`GET /api/campaigns/:id/entities/:slug`, `relation create/list/delete`) finds them, mirroring the pattern already used by `characters` and `organizations` (an extension table row + a linked `entities` row of the matching type).
- Add a new FK column on `quests` distinct from the existing `entityId` column — the existing `quests.entityId` is already in use for a different purpose (an optional pointer _from_ a quest _to_ an unrelated "linked entity", shown as "Linked entity: X" on the quest detail page) and must not be repurposed or silently overloaded.
- Populate the new mirror-entity row automatically on quest creation (`POST /api/campaigns/:id/quests`), analogous to how character/organization creation inserts into `entities`.
- Enforce campaign-wide slug uniqueness for quests against `entities` (quests currently `slugify()` their name with no collision check at all, unlike characters which use `ensureUniqueSlug`); once quests share the `entities_campaign_slug` unique index, a naive insert can collide with an existing entity of another type.
- Backfill: create mirror `entities` rows for all pre-existing quests (including the user's 9 already-created quests) as part of the migration, handling slug collisions.
- No changes required to `relation.js`/`resolveEntitySlug` in the CLI — once quests resolve through the standard entities lookup, `relation create/list/delete` work for quest slugs with zero CLI code changes. CLI docs/skills still need updating to document the new capability (see Impact).
- Out of scope / explicitly deferred (flagged as open questions in design.md): whether the entity-graph visualization (`app/pages/campaigns/[id]/graph.vue`) should render quest nodes, and whether `parentQuestId` should be deprecated in favor of relations or kept as-is.

## Capabilities

### New Capabilities

- `quest-relations`: Quests can be looked up by slug through the generic entity resolver and linked to other entities (including other quests) via the existing relation system (`relation create/list/delete`, `POST/GET/DELETE /api/campaigns/:id/relations`), exactly like characters, organizations and locations.

### Modified Capabilities

- `quest-detail`: Quest creation now also creates a backing `entities` row (type `quest`) and quest slugs must be unique campaign-wide (not just among quests), which can change slug assignment for quests whose name collides with an existing entity's slug.

## Impact

- **Data model**: `server/db/schema/sessions.ts` (`quests` table) gains a new column; `server/db/migrations/` gains a migration creating it and backfilling `entities` rows for existing quests.
- **Server API**: `server/api/campaigns/[id]/quests/index.post.ts` (create must also insert into `entities` and use unique-slug logic); relation endpoints (`server/api/campaigns/[id]/relations/*`) are unaffected in code but now accept quest entity IDs.
- **CLI (aleph-cli) — assessed per CLAUDE.md**: this changes a data model and a server API create endpoint, so per project convention:
  - `cli/src/commands/quest.js` and `cli/src/commands/relation.js` — reviewed; `relation.js` needs no code change, but should be checked for any quest-specific assumptions; `quest.js` may want an optional flag surfacing the new mirror entity id.
  - `cli/src/lib/client.js` — no HTTP interface change expected, but verify during implementation.
  - `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` — must be updated to document that quests are now relatable via `relation create --source/--target <quest-slug>` (bump SKILL.md frontmatter version).
- **Frontend**: no required changes; `app/pages/campaigns/[id]/graph.vue` / `EntityGraphView.client.vue` could optionally surface quest nodes (open question, see design.md).
- **Tests**: unit tests for the new slug-uniqueness/backfill logic, integration tests for quest creation creating an entity row and for `relation create` succeeding on quest slugs, no new E2E flow strictly required (CLI/API-level feature) but existing quest E2E flows must keep passing.
