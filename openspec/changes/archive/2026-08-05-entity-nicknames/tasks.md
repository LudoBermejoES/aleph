## 1. Database

- [x] 1.1 Add `entity_nicknames` table to Drizzle schema (`server/db/schema/entities.ts` or a new `entity-nicknames.ts`) with columns: `id`, `entity_id` (FK → entities.id, cascade delete), `nickname`, `created_at`; add unique index on (entity_id, nickname COLLATE NOCASE)
- [x] 1.2 Generate Drizzle migration for the new table
- [x] 1.3 Export the new table from `server/db/schema/index.ts`

## 2. Server API

- [x] 2.1 Create `server/api/campaigns/[id]/entities/[slug]/nicknames/index.get.ts` — list nicknames for an entity (returns array sorted by createdAt)
- [x] 2.2 Create `server/api/campaigns/[id]/entities/[slug]/nicknames/index.post.ts` — add a nickname; validate non-empty, check uniqueness (409 on duplicate, 422 on empty), call `invalidateAutomatonCache`
- [x] 2.3 Create `server/api/campaigns/[id]/entities/[slug]/nicknames/[nicknameId].delete.ts` — delete a nickname by id; call `invalidateAutomatonCache`
- [x] 2.4 Add unit tests for the nickname CRUD validation logic

## 3. Auto-link wiring

- [x] 3.1 Update `server/services/autolink-render.ts` to join/query `entity_nicknames` for the campaign and pass the aliases array to `buildAutomaton` (one batch query, not per-entity)
- [x] 3.2 Update `server/services/mention-scanner.ts` to similarly load nicknames and pass them to `buildAutomaton`; remove the `// TODO: load from entity_names table` comment
- [x] 3.3 Add a unit test that builds an automaton with aliases and verifies nickname text resolves to the correct entity

## 4. Frontend

- [x] 4.1 Create `app/components/entity/NicknamesPanel.vue` — displays existing nicknames as removable chips and an input field to add new ones; uses `useFetch` for the nicknames list and `$fetch` for create/delete
- [x] 4.2 Mount `NicknamesPanel` on the entity detail page (identify the shared entity layout component or page and add the panel in an appropriate section alongside tags/relations)
- [x] 4.3 Add i18n keys for "Nicknames", "Add nickname", "Remove nickname", "No nicknames yet" to `i18n/locales/en.json` and `i18n/locales/es.json`

## 5. CLI

- [x] 5.1 Add `entity nickname list <slug>` subcommand to `cli/src/commands/entity.js` (calls `GET /api/campaigns/[id]/entities/[slug]/nicknames`)
- [x] 5.2 Add `entity nickname add <slug> <nickname>` subcommand (calls `POST`)
- [x] 5.3 Add `entity nickname remove <slug> <nickname>` subcommand (fetches list to find id by value, then calls `DELETE`)
- [x] 5.4 Update `docs/claude-skill.md` to document the new `entity nickname` subcommands
- [x] 5.5 Update `.claude/skills/aleph-cli/SKILL.md` to mirror the same documentation
