## ADDED Requirements

### Requirement: Organizations have a paired entity row

Every organization in the `organizations` table SHALL have a corresponding row in the `entities` table with `type = 'organization'`. The `organizations` table SHALL carry an `entity_id` column that references `entities.id`. The two rows are created, updated, and deleted in the same transaction by the organization endpoints.

#### Scenario: Creating an organization also creates the entity row

- **GIVEN** a DM POSTs to `/api/campaigns/:id/organizations` with `{ name: "Iron Circle", type: "faction" }`
- **WHEN** the server processes the request
- **THEN** a new `organizations` row is inserted with `slug = 'iron-circle'`
- **AND** in the same transaction a new `entities` row is inserted with `type = 'organization'`, `name = 'Iron Circle'`, `slug = 'iron-circle'`, `visibility` mirroring the org default
- **AND** the org's `entity_id` column references the new entity row's `id`
- **AND** the response includes `entityId` so callers can resolve the org as an entity

#### Scenario: Updating an organization's name syncs the entity row

- **GIVEN** an existing organization `iron-circle` with a paired entity row
- **WHEN** a DM PUTs `/api/campaigns/:id/organizations/iron-circle` with `{ name: "The Iron Ring" }`
- **THEN** the organization's `name` and `slug` are updated
- **AND** in the same transaction the paired `entities` row's `name` and `slug` are updated to match
- **AND** the org's `entity_id` is unchanged

#### Scenario: Deleting an organization deletes the entity row

- **GIVEN** an existing organization with a paired entity row and zero or more relations pointing at the entity
- **WHEN** a DM DELETEs `/api/campaigns/:id/organizations/:slug`
- **THEN** both the organization row and its paired entity row are deleted in the same transaction
- **AND** any `entityRelations` rows where the org's `entity_id` is source or target are removed by cascade

#### Scenario: Slug collision during backfill renames only the entity-row slug

- **GIVEN** a campaign already has an entity (e.g. a character) with slug `black-hand`
- **AND** an organization in the same campaign has slug `black-hand`
- **WHEN** the backfill migration runs
- **THEN** the new entity row for the organization is inserted with slug `black-hand-org`
- **AND** the organization's own `slug` column is left unchanged as `black-hand`
- **AND** future calls to `GET /api/campaigns/:id/entities/black-hand-org` resolve to the organization's entity row

### Requirement: Entity endpoint resolves organization slugs

The `GET /api/campaigns/:id/entities/:slug` endpoint SHALL resolve organization entity slugs to the paired entity row, returning the row with `type: 'organization'`.

#### Scenario: Resolving an org slug returns the entity row

- **GIVEN** an authenticated member of campaign C
- **AND** organization `iron-circle` exists in C with a paired entity row
- **WHEN** they GET `/api/campaigns/C/entities/iron-circle`
- **THEN** the response is the entity row with `type: 'organization'` and the same `id` as `organizations.entity_id`

#### Scenario: Unauthenticated request rejected

- **GIVEN** no session cookie and no valid `X-API-Key` header
- **WHEN** the client requests `/api/campaigns/C/entities/iron-circle`
- **THEN** the server returns 401 Unauthorized
