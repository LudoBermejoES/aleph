## ADDED Requirements

### Requirement: Characters table has indexes on commonly filtered columns
The `characters` table SHALL have indexes on `characterType`, `status`, `ownerUserId`, `folderId`, and `locationEntityId`.

#### Scenario: Character list filtered by type uses index
- **GIVEN** the `idx_characters_type` index exists on `characters.characterType`
- **WHEN** `SELECT * FROM characters WHERE characterType = 'pc'` is executed
- **THEN** SQLite uses the index (verifiable via `EXPLAIN QUERY PLAN`)

#### Scenario: Character list filtered by status uses index
- **GIVEN** the `idx_characters_status` index exists on `characters.status`
- **WHEN** `SELECT * FROM characters WHERE status = 'active'` is executed
- **THEN** SQLite uses the index

#### Scenario: Characters joined on locationEntityId uses index
- **GIVEN** the `idx_characters_location` index exists on `characters.locationEntityId`
- **WHEN** a JOIN between characters and entities on `locationEntityId` is executed
- **THEN** SQLite uses the index for the join lookup

#### Scenario: Characters filtered by owner uses index
- **GIVEN** the `idx_characters_owner` index exists on `characters.ownerUserId`
- **WHEN** characters are filtered by owner
- **THEN** SQLite uses the index

#### Scenario: Characters filtered by folder uses index
- **GIVEN** the `idx_characters_folder` index exists on `characters.folderId`
- **WHEN** characters are filtered by folder
- **THEN** SQLite uses the index

---

### Requirement: Entities table has indexes on type and parentId
The `entities` table SHALL have indexes on `type` and `parentId`.

#### Scenario: Entities filtered by type uses index
- **GIVEN** the `idx_entities_type` index exists on `entities.type`
- **WHEN** `SELECT * FROM entities WHERE type = 'location'` is executed
- **THEN** SQLite uses the index

#### Scenario: Child entity lookup uses parentId index
- **GIVEN** the `idx_entities_parent` index exists on `entities.parentId`
- **WHEN** `SELECT COUNT(*) FROM entities WHERE parentId = ?` is executed
- **THEN** SQLite uses the index

---

### Requirement: Game sessions table has indexes on filter columns
The `game_sessions` table SHALL have indexes on `status`, `arcId`, `chapterId`, and `groupId`.

#### Scenario: Sessions filtered by status uses index
- **GIVEN** the `idx_sessions_status` index exists on `game_sessions.status`
- **WHEN** sessions are filtered by status
- **THEN** SQLite uses the index

#### Scenario: Sessions filtered by arc uses index
- **GIVEN** the `idx_sessions_arc` index exists on `game_sessions.arcId`
- **WHEN** sessions are filtered by arc
- **THEN** SQLite uses the index

#### Scenario: Sessions filtered by chapter uses index
- **GIVEN** the `idx_sessions_chapter` index exists on `game_sessions.chapterId`
- **WHEN** sessions are filtered by chapter
- **THEN** SQLite uses the index

#### Scenario: Sessions filtered by group uses index
- **GIVEN** the `idx_sessions_group` index exists on `game_sessions.groupId`
- **WHEN** sessions are filtered by group
- **THEN** SQLite uses the index

---

### Requirement: Organizations table has indexes on type and status
The `organizations` table SHALL have indexes on `type` and `status`.

#### Scenario: Organizations filtered by type uses index
- **GIVEN** the `idx_organizations_type` index exists on `organizations.type`
- **WHEN** organizations are filtered by type
- **THEN** SQLite uses the index

#### Scenario: Organizations filtered by status uses index
- **GIVEN** the `idx_organizations_status` index exists on `organizations.status`
- **WHEN** organizations are filtered by status
- **THEN** SQLite uses the index

---

### Requirement: Maps table has indexes on parentMapId and visibility
The `maps` table SHALL have indexes on `parentMapId` and `visibility`.

#### Scenario: Child map lookup uses parentMapId index
- **GIVEN** the `idx_maps_parent` index exists on `maps.parentMapId`
- **WHEN** `SELECT * FROM maps WHERE parentMapId = ?` is executed
- **THEN** SQLite uses the index

#### Scenario: Maps filtered by visibility uses index
- **GIVEN** the `idx_maps_visibility` index exists on `maps.visibility`
- **WHEN** maps are filtered by visibility
- **THEN** SQLite uses the index

---

### Requirement: Entity relations table has composite indexes
The `entity_relations` table SHALL have composite indexes on `(sourceEntityId, relationTypeId)` and `(targetEntityId, relationTypeId)`.

#### Scenario: Relations lookup by source and type uses composite index
- **GIVEN** the `idx_relations_source_type` index exists on `(sourceEntityId, relationTypeId)`
- **WHEN** `SELECT * FROM entity_relations WHERE sourceEntityId = ? AND relationTypeId = ?` is executed
- **THEN** SQLite uses the composite index

#### Scenario: Relations lookup by target and type uses composite index
- **GIVEN** the `idx_relations_target_type` index exists on `(targetEntityId, relationTypeId)`
- **WHEN** `SELECT * FROM entity_relations WHERE targetEntityId = ? AND relationTypeId = ?` is executed
- **THEN** SQLite uses the composite index

---

### Requirement: Session attendance has composite index
The `session_attendance` table SHALL have a composite index on `(sessionId, userId)`.

#### Scenario: Attendance lookup by session and user uses composite index
- **GIVEN** the `idx_attendance_session_user` index exists on `(sessionId, userId)`
- **WHEN** `SELECT * FROM session_attendance WHERE sessionId = ? AND userId = ?` is executed
- **THEN** SQLite uses the composite index

---

### Requirement: Inventory items has composite index
The `inventory_items` table SHALL have a composite index on `(inventoryId, itemId)`.

#### Scenario: Inventory item lookup uses composite index
- **GIVEN** the `idx_inventory_items_inv_item` index exists on `(inventoryId, itemId)`
- **WHEN** `SELECT * FROM inventory_items WHERE inventoryId = ? AND itemId = ?` is executed
- **THEN** SQLite uses the composite index

---

### Requirement: Index migration is non-destructive
The migration SHALL use `CREATE INDEX IF NOT EXISTS` and SHALL NOT drop or modify any existing tables or columns.

#### Scenario: Migration is idempotent
- **WHEN** the migration is run twice
- **THEN** no errors occur (IF NOT EXISTS prevents duplicate creation)

#### Scenario: Migration does not alter table structure
- **WHEN** the migration is applied
- **THEN** no columns are added, removed, or modified — only indexes are created
