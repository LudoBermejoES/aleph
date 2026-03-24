# Tasks: Character Management

## 1. Database Schema

- [ ] 1.1 Create `characters` schema extending entities with type, race, class, alignment, status, owner
- [ ] 1.2 Create `stat_groups` and `stat_definitions` schemas with secret flag
- [ ] 1.3 Create `character_stats` schema for stat values
- [ ] 1.4 Create `abilities` schema with type enum and tags JSON
- [ ] 1.5 Create `character_connections` schema
- [ ] 1.6 Create `character_folders` schema with nesting
- [ ] 1.7 Generate and apply migration

## 2. Character CRUD API

- [ ] 2.1 Implement character create (creates entity + character row in transaction)
- [ ] 2.2 Implement character read (joins entity + character + stats + abilities)
- [ ] 2.3 Implement character update with ownership check for player edits
- [ ] 2.4 Implement character delete (cascades to stats, abilities, connections)
- [ ] 2.5 Implement character list with filters: type (pc/npc), status, race, class, tag, folder
- [ ] 2.6 Strip secret stats and abilities from non-DM API responses

## 3. Stats API

- [ ] 3.1 Implement stat group CRUD with template association
- [ ] 3.2 Implement stat definition CRUD with ordering
- [ ] 3.3 Implement character stat value read/update (bulk update endpoint)
- [ ] 3.4 Add `player_editable` flag to stat groups and enforce in RBAC

## 4. Abilities API

- [ ] 4.1 Implement ability CRUD scoped to character
- [ ] 4.2 Implement ability reordering
- [ ] 4.3 Implement ability filtering by type and tags

## 5. Connections & Folders

- [ ] 5.1 Implement character connection CRUD
- [ ] 5.2 Implement character folder CRUD with nesting
- [ ] 5.3 Implement character-to-folder assignment

## 6. Duplicate Endpoint

- [ ] 6.1 Implement deep copy: entity + character + stats + abilities
- [ ] 6.2 Copy markdown file with "(Copy)" name suffix
- [ ] 6.3 Return new character slug in response

## 7. Character Pages

- [ ] 7.1 Create `app/pages/campaigns/[id]/characters/index.vue` (codex with PC/NPC toggle)
- [ ] 7.2 Create `app/pages/campaigns/[id]/characters/[slug].vue` (character detail)
- [ ] 7.3 Build stat group display component with secret stat hiding
- [ ] 7.4 Build abilities list component grouped by type
- [ ] 7.5 Build connections section component
- [ ] 7.6 Build character edit form with player-editable field restrictions
- [ ] 7.7 Build NPC folder sidebar with drag-and-drop organization
- [ ] 7.8 Build mount/companion display as nested entries under parent character

## 8. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 8.1 Test character creation transaction: entity row + character row created atomically; rollback on failure leaves neither
- [ ] 8.2 Test secret stat stripping: given a character with secret and non-secret stats, stripping for player role removes only secret stats

### Integration Tests (@nuxt/test-utils)

- [ ] 8.3 Test character CRUD: create character (creates entity + character row); read returns joined data with stats and abilities; update modifies fields; delete cascades to stats and abilities
- [ ] 8.4 Test player ownership restriction: player can edit own character; player cannot edit another player's character (403)
- [ ] 8.5 Test DM override: DM can edit any character regardless of ownership
- [ ] 8.6 Test NPC secret visibility: player GET on NPC with secret stats/abilities receives response with secrets stripped; DM receives full response
- [ ] 8.7 Test stat group CRUD: create stat group with definitions; bulk update stat values; read returns updated values
- [ ] 8.8 Test `player_editable` flag: player can update stats in player_editable group; player cannot update stats in non-editable group (403)
- [ ] 8.9 Test ability CRUD: create ability scoped to character; reorder abilities; filter by type and tags
- [ ] 8.10 Test character list filters: filter by type (pc/npc), status, race, class, tag, folder returns correct subsets
- [ ] 8.11 Test character duplicate endpoint: deep copy produces new character with "(Copy)" suffix; original unchanged
- [ ] 8.12 Test character folder assignment: create folder, assign character to folder, list by folder returns character

### Component Tests (@vue/test-utils)

- [ ] 8.13 Test stat group display component: renders stat values; hides secret stats for player role
- [ ] 8.14 Test character edit form: player_editable fields are enabled; non-editable fields are disabled for player role
