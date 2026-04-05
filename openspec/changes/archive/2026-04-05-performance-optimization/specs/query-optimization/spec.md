## MODIFIED Requirements

### Requirement: Character list uses JOINs instead of per-row subqueries

The `GET /api/campaigns/:id/characters` endpoint SHALL fetch all character data — including location name, primary organization name, and primary organization role — in a single query using LEFT JOINs. It SHALL NOT execute additional queries per character row.

#### Scenario: Character list returns location and organization data

- **GIVEN** a campaign with 10 characters, each assigned to a location and a primary organization
- **WHEN** `GET /api/campaigns/:id/characters` is called
- **THEN** the response includes `locationName`, `primaryOrgName`, and `primaryOrgRole` for each character, and the total number of database queries is constant (not proportional to character count)

#### Scenario: Character with no location returns null location fields

- **GIVEN** a character that has no `locationEntityId`
- **WHEN** the character list is fetched
- **THEN** `locationName` is null and the query does not error

#### Scenario: Character with no primary organization returns null org fields

- **GIVEN** a character that has no organization membership marked as primary
- **WHEN** the character list is fetched
- **THEN** `primaryOrgName` and `primaryOrgRole` are null

#### Scenario: Response shape is unchanged

- **WHEN** `GET /api/campaigns/:id/characters` is called
- **THEN** the response JSON shape is identical to the current format — same field names and types

---

### Requirement: Location list uses SQL aggregation instead of in-memory computation

The `GET /api/campaigns/:id/locations` endpoint SHALL compute child counts and inhabitant counts using SQL `COUNT` subqueries or JOINs. It SHALL NOT load all locations and all characters into memory. It SHALL NOT read the filesystem to resolve entity subtypes.

#### Scenario: Location list returns child counts

- **GIVEN** a location "Kingdom" with 3 child locations
- **WHEN** the location list is fetched
- **THEN** the "Kingdom" entry includes `childCount: 3` computed via SQL, not JS

#### Scenario: Location list returns inhabitant counts

- **GIVEN** a location "Village" with 5 characters assigned to it
- **WHEN** the location list is fetched
- **THEN** the "Village" entry includes `inhabitantCount: 5` computed via SQL

#### Scenario: Location with no children or inhabitants returns zero counts

- **GIVEN** a location with no child locations and no characters
- **WHEN** the location list is fetched
- **THEN** the entry includes `childCount: 0` and `inhabitantCount: 0`

#### Scenario: Location subtype resolved from database, not filesystem

- **WHEN** the location list is fetched
- **THEN** each location's subtype is read from the database query result, not from a filesystem call

---

### Requirement: Search endpoint uses pre-filtered JOINs

The `GET /api/campaigns/:id/search` endpoint SHALL perform visibility checks, type filtering, and slug enrichment within the main query using JOINs and WHERE clauses. It SHALL NOT execute per-result queries for these purposes.

#### Scenario: Search returns enriched results in a single query pass

- **GIVEN** a campaign with 50 searchable entities of mixed types
- **WHEN** `GET /api/campaigns/:id/search?q=dragon` is called
- **THEN** results include type, slug, and name — and the total number of database queries is constant regardless of result count

#### Scenario: Search respects visibility within the query

- **GIVEN** a player searching a campaign
- **WHEN** the search is executed
- **THEN** only entities visible to the player's role are returned, with visibility filtering done in SQL (WHERE clause), not post-query in JS

#### Scenario: Search filters by type in SQL

- **WHEN** `GET /api/campaigns/:id/search?q=dragon&type=character` is called
- **THEN** only character results are returned, with the type filter applied in the SQL WHERE clause

#### Scenario: Empty search returns empty results

- **WHEN** `GET /api/campaigns/:id/search?q=` is called with an empty query
- **THEN** the response is an empty array, without executing enrichment queries

---

## ADDED Requirements

### Requirement: Query performance is verifiable

The system SHALL allow query count verification during testing. Integration tests SHALL be able to confirm that N+1 patterns have been eliminated by checking that the number of queries is O(1) not O(N) relative to result count.

#### Scenario: Character list query count is constant

- **GIVEN** a campaign with N characters
- **WHEN** the character list is fetched
- **THEN** the number of database queries executed is the same whether N is 1 or 200

#### Scenario: Location list query count is constant

- **GIVEN** a campaign with N locations
- **WHEN** the location list is fetched
- **THEN** the number of database queries executed is the same whether N is 1 or 200

#### Scenario: Search query count is constant

- **GIVEN** a search returning N results
- **WHEN** the search is executed
- **THEN** the number of database queries executed is the same whether N is 1 or 50
