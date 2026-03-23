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
