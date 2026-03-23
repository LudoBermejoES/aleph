# data-model Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: User and Authentication Schema

The system SHALL store user accounts and sessions in SQLite, managed by Better Auth with Drizzle ORM.

#### Scenario: Core user tables
- GIVEN the authentication system
- WHEN the database is initialized
- THEN the following tables exist:
  - `users` (id, username, email, password_hash, system_role, avatar_path, created_at, updated_at)
  - `sessions` (id, user_id, token, expires_at, created_at) -- managed by Better Auth
  - `accounts` (id, user_id, provider, provider_account_id) -- for future OAuth
- AND `system_role` is either 'admin' or 'user' (default: 'user')
- AND passwords are hashed with bcrypt/argon2 (handled by Better Auth)

### Requirement: Campaign and Membership Schema

The system SHALL store campaigns, memberships, roles, and invitations.

#### Scenario: Campaign tables
- GIVEN the campaign management system
- WHEN a campaign is created
- THEN the following tables are used:
  - `campaigns` (id, name, slug, description, is_public, theme, content_dir, created_by, created_at, updated_at)
  - `campaign_members` (id, campaign_id, user_id, role, joined_at)
  - `campaign_member_permissions` (id, campaign_member_id, permission, granted_by, granted_at)
  - `campaign_invitations` (id, campaign_id, token, role, created_by, expires_at, used_at)
- AND `role` is one of: 'dm', 'co_dm', 'editor', 'player', 'visitor'
- AND `permission` is one of: 'quest_keeper', 'lore_keeper', 'cartographer', 'shopkeeper', 'chronicler', 'treasurer'
- AND `content_dir` points to the filesystem directory for this campaign's `.md` files

### Requirement: Entity System Schema

The system SHALL store entity metadata in SQLite while content lives in `.md` files. The schema supports polymorphic entities with customizable templates and fields.

#### Scenario: Entity metadata tables
- GIVEN the wiki/entity system
- WHEN entities are created and managed
- THEN the following tables are used:
  - `entities` (id, campaign_id, type, name, slug, file_path, visibility, content_hash, parent_id, template_id, created_by, created_at, updated_at)
  - `entity_templates` (id, campaign_id, name, type, fields_json, layout_json, created_by, created_at)
  - `entity_fields` (id, entity_id, template_field_id, name, value, field_type, sort_order)
  - `entity_tags` (entity_id, tag_id)
  - `tags` (id, campaign_id, name, slug, color)
- AND `type` is one of the built-in types (character, location, faction, item, event, lore, quest, session, note) or a user-created type
- AND `visibility` is one of: 'public', 'members', 'editors', 'dm_only', 'private', 'specific_users'
- AND `parent_id` enables infinite hierarchical nesting (location within location, etc.)
- AND `field_type` is one of: 'text', 'number', 'checkbox', 'select', 'date', 'entity_reference', 'section'

#### Scenario: Entity names and aliases for auto-linking
- GIVEN the auto-linking engine
- WHEN entities are created or renamed
- THEN the following table is updated:
  - `entity_names` (id, entity_id, name, name_lower, is_primary)
- AND the primary name and all aliases are stored with lowercased versions for case-insensitive matching
- AND a unique constraint exists on (entity_id, name_lower)

#### Scenario: Entity relationships (bidirectional connections)
- GIVEN the relationship graph feature
- WHEN connections between entities are created
- THEN the following table is used:
  - `entity_relations` (id, campaign_id, source_entity_id, target_entity_id, relation_type, forward_label, reverse_label, attitude, description, metadata_json, visibility, is_pinned, created_at, updated_at)
- AND each row represents one bidirectional relationship with asymmetric labels (e.g., "parent of" / "child of")
- AND querying either direction uses a CASE expression to swap labels and entity IDs
- AND `relation_type` includes: ally, enemy, rival, mentor, family:parent, family:sibling, family:spouse, member_of, leader_of, located_in, owns, created_by, occurred_at, worships, allied_with, at_war_with, custom
- AND `attitude` is an integer from -100 to +100

#### Scenario: Specific user visibility
- GIVEN an entity with 'specific_users' visibility
- WHEN users are granted access
- THEN the following table is used:
  - `entity_specific_viewers` (entity_id, user_id)
- AND only listed users (plus DM+) can see the entity

### Requirement: Map Schema

The system SHALL store map metadata, layers, pins, and groups for the interactive map system.

#### Scenario: Map tables
- GIVEN the map system
- WHEN maps are created with pins and layers
- THEN the following tables are used:
  - `maps` (id, campaign_id, entity_id, name, slug, image_path, width, height, parent_map_id, sort_order, calibration_json, created_by, created_at, updated_at)
  - `map_layers` (id, map_id, name, type, image_path, opacity, sort_order, is_default_visible)
  - `map_pins` (id, map_id, layer_id, group_id, linked_entity_id, linked_map_id, name, description, x, y, icon, color, size, visibility, created_at)
  - `map_groups` (id, map_id, name, color, icon, is_default_visible, sort_order)
- AND `parent_map_id` enables nested map hierarchies (world > region > city > building)
- AND pins can link to either a wiki entity or a child map (but not both)
- AND `calibration_json` stores scale and unit data for distance measurement

### Requirement: Session and Story Schema

The system SHALL store session scheduling, adventure logs, story structure, and decision tracking.

#### Scenario: Session and story tables
- GIVEN the campaign/session management system
- WHEN sessions and story elements are managed
- THEN the following tables are used:
  - `sessions` (id, campaign_id, number, title, scheduled_at, status, arc_id, chapter_id, created_at, updated_at)
  - `session_attendance` (session_id, user_id, status)
  - `arcs` (id, campaign_id, name, description, sort_order, status)
  - `chapters` (id, arc_id, name, description, sort_order, status)
  - `decisions` (id, session_id, campaign_id, description, decision_type, outcome, decided_by_json, consequence_json, linked_entity_id, created_at)
  - `quests` (id, campaign_id, name, description, status, parent_quest_id, visibility, assigned_to_json, created_at, updated_at)
- AND `status` for sessions is one of: 'scheduled', 'in_progress', 'completed', 'cancelled'
- AND `status` for arcs/chapters is one of: 'planned', 'active', 'completed', 'skipped'
- AND `status` for quests is one of: 'active', 'completed', 'failed', 'abandoned'
- AND `decision_type` is one of: 'choice', 'role', 'count', 'destiny' (inspired by Amsel Tome Arcana)
- AND session content/notes live in `.md` files, not in the database

### Requirement: Calendar and Timeline Schema

The system SHALL store custom calendar definitions and timeline events.

#### Scenario: Calendar and timeline tables
- GIVEN the calendar and timeline system
- WHEN custom calendars and events are managed
- THEN the following tables are used:
  - `calendars` (id, campaign_id, name, current_date_json, config_json, created_at, updated_at)
  - `calendar_events` (id, calendar_id, name, description, date_json, end_date_json, is_recurring, recurrence_json, linked_entity_id, visibility, created_at)
  - `timelines` (id, campaign_id, name, description, sort_order, created_at)
  - `timeline_events` (id, timeline_id, name, description, date_json, end_date_json, era, linked_entity_id, sort_order, created_at)
  - `moons` (id, calendar_id, name, cycle_days, phase_offset, color)
  - `seasons` (id, calendar_id, name, start_month, start_day, end_month, end_day)
- AND `config_json` stores the full calendar definition: months (name, days), weekdays (names), year_length, intercalary periods, epoch
- AND `date_json` stores dates as structured objects `{"year": 1302, "month": 3, "day": 15}` since custom calendars cannot use standard date types
- AND age auto-calculation uses `current_date_json` minus a character's birth `date_json`

### Requirement: Inventory and Economy Schema

The system SHALL store items, inventories, shops, currencies, and transactions.

#### Scenario: Inventory and economy tables
- GIVEN the inventory and economy system
- WHEN items, shops, and transactions are managed
- THEN the following tables are used:
  - `items` (id, campaign_id, name, description, weight, price_json, size, rarity, type, image_path, properties_json, created_at)
  - `inventory_entries` (id, owner_entity_id, owner_type, item_id, quantity, position, notes, acquired_at)
  - `shops` (id, campaign_id, name, description, location_entity_id, shopkeeper_entity_id, is_player_owned, owned_by_user_id, till_json, created_at)
  - `shop_stock` (id, shop_id, item_id, quantity, price_override_json, is_available)
  - `currencies` (id, campaign_id, name, symbol, value_in_base, sort_order)
  - `wealth_records` (id, owner_entity_id, owner_type, amounts_json, updated_at)
  - `transactions` (id, campaign_id, from_entity_id, to_entity_id, item_id, quantity, amounts_json, transaction_type, notes, created_at)
- AND `owner_type` is one of: 'character', 'party', 'shop', 'faction'
- AND `price_json` and `amounts_json` store multi-currency values as `{"gold": 10, "silver": 5}`
- AND `position` groups items within an inventory (e.g., "Equipped", "Backpack", "Wagon")
- AND `transaction_type` is one of: 'purchase', 'sale', 'loot', 'trade', 'gift', 'loss'

### Requirement: Permission Schema

The system SHALL store entity-level permission overrides and the visibility resolution data.

#### Scenario: Permission tables
- GIVEN the RBAC system with entity-level overrides
- WHEN permissions are configured
- THEN the following table is used:
  - `entity_permissions` (id, entity_id, target_user_id, target_role, permission, effect, granted_by, created_at)
- AND exactly one of `target_user_id` or `target_role` is set (CHECK constraint)
- AND `permission` is one of: 'view', 'edit', 'delete'
- AND `effect` is one of: 'allow', 'deny'
- AND resolution order is: entity-level user override > entity-level role override > campaign role default

### Requirement: Search Index Schema

The system SHALL maintain FTS5 virtual tables synchronized with `.md` file content for full-text search.

#### Scenario: FTS5 search index
- GIVEN the search system
- WHEN the search index is created and maintained
- THEN the following FTS5 virtual table exists:
  ```sql
  CREATE VIRTUAL TABLE entities_fts USING fts5(
    name,
    aliases,
    tags,
    body,
    tokenize='porter unicode61',
    prefix='2 3'
  );
  ```
- AND a content shadow table `entities_fts_content` (rowid, entity_id, campaign_id, name, aliases, tags, body) stores the indexed text
- AND triggers on the shadow table keep the FTS5 index in sync
- AND content is re-indexed when `.md` files change (detected by content_hash comparison)
- AND search queries use BM25 ranking with weighted fields: name (10x), aliases (8x), tags (2x), body (1x)
- AND the `snippet()` function provides highlighted search result excerpts

#### Scenario: Entity name index for auto-linking
- GIVEN the auto-linking engine
- WHEN candidate documents need to be found for retroactive linking
- THEN FTS5 is used to narrow candidates: `WHERE entities_fts MATCH '"entity name"'`
- AND the `entity_names` table (with `name_lower` column indexed) feeds the Aho-Corasick automaton
- AND the automaton is rebuilt per-campaign on name/alias changes and cached in memory

