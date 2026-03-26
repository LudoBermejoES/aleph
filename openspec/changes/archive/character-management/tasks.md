# Tasks: Character Management

## 1. Database Schema

- [x] 1.1 Create `characters` schema extending entities with type, race, class, alignment, status, owner
- [x] 1.2 Create `stat_groups` and `stat_definitions` schemas with secret flag
- [x] 1.3 Create `character_stats` schema for stat values
- [x] 1.4 Create `abilities` schema with type enum and tags JSON
- [x] 1.5 Create `character_connections` schema
- [x] 1.6 Create `character_folders` schema with nesting
- [x] 1.7 Generate and apply migration

## 2. Character CRUD API

- [x] 2.1 Implement character create (creates entity + character row in transaction)
- [x] 2.2 Implement character read (joins entity + character + stats + abilities)
- [x] 2.3 Implement character update with ownership check for player edits
- [x] 2.4 Implement character delete (cascades to stats, abilities, connections)
- [x] 2.5 Implement character list with filters: type (pc/npc), status, race, class, tag, folder
- [x] 2.6 Strip secret stats and abilities from non-DM API responses

## 3. Stats API

- [x] 3.1 Implement stat group CRUD with template association
- [x] 3.2 Implement stat definition CRUD with ordering
- [x] 3.3 Implement character stat value read/update (bulk update endpoint)
- [x] 3.4 Add `player_editable` flag to stat groups and enforce in RBAC

## 4. Abilities API

- [x] 4.1 Implement ability CRUD scoped to character
- [x] 4.2 Implement ability reordering (via PUT with sortOrder)
- [x] 4.3 Implement ability filtering by type and tags

## 5. Connections & Folders

- [x] 5.1 Implement character connection CRUD (GET list, POST create)
- [x] 5.2 Implement character folder CRUD with nesting (GET list, POST create)
- [x] 5.3 Implement character-to-folder assignment

## 6. Duplicate Endpoint

- [x] 6.1 Implement deep copy: entity + character + stats + abilities
- [x] 6.2 Copy markdown file with "(Copy)" name suffix
- [x] 6.3 Return new character slug in response

## 7. Character Pages

- [x] 7.1 Create `app/pages/campaigns/[id]/characters/index.vue` (codex with PC/NPC toggle)
- [x] 7.2 Create `app/pages/campaigns/[id]/characters/[slug].vue` (character detail)
- [x] 7.3 Build stat group display component with secret stat hiding
- [x] 7.4 Build abilities list component grouped by type
- [x] 7.5 Build connections section component
- [x] 7.6 Build character edit form with player-editable field restrictions
- [x] 7.7 Build NPC folder sidebar with drag-and-drop organization
- [x] 7.8 Build mount/companion display as nested entries under parent character

## 8. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [x] 8.1 Test stripSecretStats: player sees non-secret only, DM/co_dm sees all (5 tests)
- [x] 8.2 Test stripSecretAbilities: player sees non-secret only, DM sees all (2 tests)
- [x] 8.3 Test canEditCharacter: DM/co_dm/editor any, player own only, visitor none (7 tests)
- [x] 8.4 Test buildCharacterFrontmatter: required fields, excludes undefined, includes optional (4 tests)
- [x] 8.5 Test buildDuplicateName: appends (Copy) (2 tests)

### Schema Tests (`:memory:` SQLite)

- [x] 8.6 Test character-entity FK and cascade delete
- [x] 8.7 Test stat groups with secret definitions and character stats
- [x] 8.8 Test abilities with secret flag filtering
- [x] 8.9 Test player_editable flag on stat groups

### Integration Tests (API)

- [x] 8.10 Test character CRUD: create, read, update, delete via API
- [x] 8.11 Test ability CRUD via API
- [x] 8.12 Test character list filter by type
- [x] 8.13 Test duplicate endpoint: creates copy with (Copy) suffix
- [x] 8.14 Test player ownership restriction: player can edit own character only
- [x] 8.15 Test NPC secret visibility: secrets stripped for non-DM
- [x] 8.16 Test stat bulk update with player_editable enforcement
- [x] 8.17 Test character folder assignment

### Component Tests

- [x] 8.18 Test stat group display component
- [x] 8.19 Test character edit form

### E2E Tests (Playwright)

- [x] 8.20 E2E: navigate to characters page
- [x] 8.21 E2E: create character via API and view detail
- [x] 8.22 E2E: character edit form saves changes
- [x] 8.23 E2E: PC/NPC filter toggle
