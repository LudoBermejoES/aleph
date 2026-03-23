# Design: Character Management

## Technical Approach

### Character as Entity Extension

Characters are entities with `entity_type = 'character'`. Additional structured data lives in a dedicated table rather than overloading frontmatter:

- `characters` table: `id, entity_id (FK unique), character_type (pc|npc), race, class, alignment, status (alive|dead|missing|unknown), location_entity_id (FK nullable), owner_user_id (FK nullable, for PCs), is_companion_of (FK nullable, character_id)`
- This extends the entity without replacing it -- the entity's `.md` file still holds the narrative content

### Stat Groups

- `stat_groups` table: `id, campaign_id, name, template_id (nullable), sort_order`
- `stat_definitions` table: `id, stat_group_id, name, key, value_type (number|text|boolean), default_value, sort_order, is_secret`
- `character_stats` table: `id, character_id, stat_definition_id, value`
- DM defines stat groups per template (e.g., "Combat Stats", "Social Stats")
- `is_secret` stats are stripped from API responses for non-DM users
- Stat values stored as text, cast to appropriate type on read

### Abilities

- `abilities` table: `id, character_id, name, type (action|reaction|passive|spell|trait|custom), description, tags (JSON array), sort_order, is_secret`
- Abilities displayed as a grouped list on the character detail page
- Tags enable cross-character ability searching

### Character Connections

- `character_connections` table: `id, character_id, target_entity_id, label, description, sort_order`
- Lightweight directional links (not the full relationship graph from change 10)
- Displayed as a "Connections" section on the character detail page

### NPC Codex

- List page with: search by name, filter by status/race/class/tag, folder grouping
- `character_folders` table: `id, campaign_id, name, parent_folder_id, sort_order`
- Duplicate endpoint: deep-copies entity + character + stats + abilities with "(Copy)" suffix

### PC Codex

- Filtered view showing only `character_type = 'pc'`
- Player ownership via `owner_user_id` -- players see edit controls for their own characters
- Mount/companion linking via `is_companion_of` -- displayed as nested entries under the parent character

### Player Editing Permissions

- Players can edit their own PC's: name, description, markdown content, non-secret stats, abilities
- DM controls which stat groups are player-editable via a `player_editable` flag on `stat_groups`
- All edits go through the same API with RBAC checks

### API Endpoints

```
GET/POST       /api/campaigns/:id/characters
GET/PUT/DELETE /api/campaigns/:id/characters/:slug
GET/PUT        /api/campaigns/:id/characters/:slug/stats
GET/POST       /api/campaigns/:id/characters/:slug/abilities
PUT/DELETE     /api/campaigns/:id/characters/:slug/abilities/:abilityId
POST           /api/campaigns/:id/characters/:slug/duplicate
GET/POST       /api/campaigns/:id/character-folders
```
