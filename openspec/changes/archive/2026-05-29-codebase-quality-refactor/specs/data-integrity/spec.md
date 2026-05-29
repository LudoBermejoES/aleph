## ADDED Requirements

### Requirement: Character duplication is transactional

`POST /api/campaigns/:id/characters/:slug/duplicate` SHALL wrap its inserts (entity row, character row, character stats, abilities) in a single `db.transaction()`. If any insert fails, the transaction SHALL roll back so no orphaned `entities` or `characters` rows remain.

#### Scenario: Successful duplication commits all rows

- **WHEN** a DM duplicates a character with stats and abilities
- **THEN** the new entity, character, all stats, and all abilities are committed together and the new character is returned

#### Scenario: Failure mid-operation rolls back

- **WHEN** an insert fails partway through duplication (e.g., an abilities insert throws)
- **THEN** the transaction rolls back and no new `entities` or `characters` row is left in the database

#### Scenario: Permission still enforced

- **WHEN** a user without editor-or-above role calls the duplicate endpoint
- **THEN** the server returns HTTP 403 and no rows are written

---

### Requirement: Multi-write operations audited for transactions

The change SHALL audit other multi-write mutation endpoints (character family-link creation and any insert+update pairs) and wrap them in `db.transaction()` where a partial write would corrupt state. Single-write endpoints SHALL be left unchanged.

#### Scenario: Family link creation is atomic

- **WHEN** creating a character family link performs more than one write
- **THEN** those writes occur inside a single transaction

#### Scenario: Single-write endpoint not over-wrapped

- **WHEN** an endpoint performs exactly one insert or one update
- **THEN** it is NOT wrapped in a transaction (no unnecessary overhead)
