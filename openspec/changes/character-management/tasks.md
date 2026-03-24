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
- [ ] 4.2 Implement ability reordering
- [ ] 4.3 Implement ability filtering by type and tags

## 5. Connections & Folders

- [ ] 5.1 Implement character connection CRUD
- [ ] 5.2 Implement character folder CRUD with nesting
- [ ] 5.3 Implement character-to-folder assignment

## 6. Duplicate Endpoint

- [x] 6.1 Implement deep copy: entity + character + stats + abilities
- [x] 6.2 Copy markdown file with "(Copy)" name suffix
- [x] 6.3 Return new character slug in response

## 7. Character Pages

- [x] 7.1 Create `app/pages/campaigns/[id]/characters/index.vue` (codex with PC/NPC toggle)
- [x] 7.2 Create `app/pages/campaigns/[id]/characters/[slug].vue` (character detail)
- [x] 7.3 Build stat group display component with secret stat hiding
- [x] 7.4 Build abilities list component grouped by type
- [ ] 7.5 Build connections section component
- [ ] 7.6 Build character edit form with player-editable field restrictions
- [ ] 7.7 Build NPC folder sidebar with drag-and-drop organization
- [ ] 7.8 Build mount/companion display as nested entries under parent character

## 8. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 8.1 Test character creation transaction: entity row + character row created atomically; rollback on failure leaves neither
- [ ] 8.2 Test secret stat stripping: given a character with secret and non-secret stats, stripping for player role removes only secret stats

### Integration Tests

- [ ] 8.3 Test character CRUD: create, read, update, delete via API
- [ ] 8.4 Test player ownership restriction: player can edit own character only
- [ ] 8.5 Test DM override: DM can edit any character
- [ ] 8.6 Test NPC secret visibility: secrets stripped for non-DM
- [ ] 8.7 Test stat group CRUD and bulk update
- [ ] 8.8 Test player_editable flag enforcement
- [ ] 8.9 Test ability CRUD
- [ ] 8.10 Test character list filters
- [ ] 8.11 Test duplicate endpoint
- [ ] 8.12 Test character folder assignment

### Component Tests

- [ ] 8.13 Test stat group display component
- [ ] 8.14 Test character edit form
