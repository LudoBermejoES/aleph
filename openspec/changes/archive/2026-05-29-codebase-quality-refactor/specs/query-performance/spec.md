## ADDED Requirements

### Requirement: Calendar list endpoint batch-loads children

`GET /api/campaigns/:id/calendars` SHALL NOT issue one query per calendar to fetch moons and seasons. It SHALL collect all calendar IDs and fetch moons and seasons in a single `inArray`-based query each, then group results in memory.

#### Scenario: Single batched query for moons regardless of calendar count

- **WHEN** a campaign with 10 calendars calls `GET /api/campaigns/:id/calendars`
- **THEN** moons are fetched in one query (using `inArray(calendarMoons.calendarId, ids)`), not 10 queries

#### Scenario: Response content unchanged

- **WHEN** the batched endpoint returns calendars
- **THEN** each calendar object still includes its `moons` and `seasons` arrays, identical to the previous per-row behavior

#### Scenario: Empty calendar list

- **WHEN** a campaign has zero calendars
- **THEN** the endpoint returns an empty result and issues no child queries

---

### Requirement: Inventory list endpoint batch-loads items

`GET /api/campaigns/:id/inventories` SHALL fetch inventory items for all inventories in a single `inArray`-based query rather than one query per inventory inside `.map()`.

#### Scenario: Single batched query for inventory items

- **WHEN** a campaign with 50 inventories calls `GET /api/campaigns/:id/inventories`
- **THEN** inventory items are fetched in one query, not 50

#### Scenario: Each inventory keeps its items array

- **WHEN** the batched endpoint returns inventories
- **THEN** each inventory object includes its `items` array identical to before

---

### Requirement: Session decisions endpoint batch-loads consequences

`GET /api/campaigns/:id/sessions/:slug/decisions` SHALL fetch consequences for all decisions in a single `inArray`-based query, then apply role-based revelation filtering in memory.

#### Scenario: Single batched query for consequences

- **WHEN** a session has 20 decisions
- **THEN** consequences are fetched in one query, not 20

#### Scenario: Role-based consequence filtering preserved

- **WHEN** a player (non-DM role) requests decisions
- **THEN** only revealed consequences are returned per decision, identical to the previous filtering behavior

---

### Requirement: Genealogy service batch-loads relations

`server/services/genealogy.ts` SHALL NOT call `loadRelations(entityId)` once per node inside the BFS traversal loop. It SHALL batch relation fetches for the frontier of nodes using `inArray`, chunking at 900 IDs to respect the SQLite bind-parameter limit.

#### Scenario: Batched relation fetch for a frontier

- **WHEN** the BFS frontier contains 30 entity IDs
- **THEN** relations are fetched in one (or chunked) `inArray` query rather than 30 separate queries

#### Scenario: Genealogy tree output unchanged

- **WHEN** the genealogy of a character with a multi-generation family is requested
- **THEN** the resulting tree (nodes, edges, generations) is identical to the pre-refactor output

#### Scenario: Chunk guard for large frontiers

- **WHEN** a frontier exceeds 900 IDs
- **THEN** the query is split into chunks of at most 900 IDs and results are merged

---

### Requirement: Missing foreign-key indexes added

The system SHALL add indexes on the `campaign_id` column of the following tables, each of which is queried by `campaignId` with no supporting index: `tags`, `arcs`, `quests`, `organizations`, `items`, `inventories`, `currencies`. These SHALL be delivered in a single Drizzle migration whose `_journal.json` ordering is verified to be later than the prior migration.

#### Scenario: Index exists after migration on fresh DB

- **WHEN** the migration is applied to a fresh database
- **THEN** an index on `tags.campaign_id` (and the other six tables) exists and is queryable

#### Scenario: Migration is not silently skipped

- **WHEN** the new migration is generated
- **THEN** its `when` timestamp in `_journal.json` is greater than the previous entry, so it applies on startup
