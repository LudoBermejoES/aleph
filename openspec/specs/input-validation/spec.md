# input-validation Specification

## Purpose

Puts Zod validation behind every mutating API endpoint through a shared `validateBody` utility -- campaigns, characters, entities, relations (attitude constrained to -100..+100), transactions (positive amounts) and all remaining POST/PUT/PATCH routes -- and escapes `%` and `_` in search parameters before they reach SQL `LIKE` clauses.

## Requirements

### Requirement: Shared validateBody utility

The system SHALL provide a `validateBody<T>(event, schema: ZodSchema<T>): Promise<T>` function in `server/utils/validate.ts`. It SHALL call `readBody(event)`, parse the result with the provided Zod schema, and on validation failure throw an HTTP 422 error with structured field-level errors.

#### Scenario: Valid body passes validation

- **WHEN** a request body matches the Zod schema
- **THEN** `validateBody` returns the parsed (and typed) body

#### Scenario: Invalid body returns 422 with field errors

- **WHEN** a request body has a missing required field `name`
- **THEN** `validateBody` throws a 422 error with body `{ statusCode: 422, message: 'Validation failed', data: { errors: [{ path: 'name', message: 'Required' }] } }`

#### Scenario: Extra fields are stripped

- **WHEN** a request body contains fields not in the schema
- **THEN** `validateBody` returns only the fields defined in the schema (Zod `.strict()` or `.strip()`)

#### Scenario: Null body returns 422

- **WHEN** a request has no body (null/undefined)
- **THEN** `validateBody` throws a 422 error with message indicating body is required

---

### Requirement: Campaign mutation endpoints validate input

The system SHALL validate request bodies on `POST /api/campaigns` and `PUT /api/campaigns/:id` with Zod schemas.

#### Scenario: Create campaign with valid data

- **WHEN** `POST /api/campaigns` is called with `{ name: "My Campaign" }`
- **THEN** the campaign is created successfully

#### Scenario: Create campaign with empty name rejected

- **WHEN** `POST /api/campaigns` is called with `{ name: "" }`
- **THEN** the server returns HTTP 422 with a field error for `name`

#### Scenario: Update campaign validates isPublic type

- **WHEN** `PUT /api/campaigns/:id` is called with `{ isPublic: "yes" }`
- **THEN** the server returns HTTP 422 (isPublic must be boolean)

#### Scenario: Campaign name length is bounded

- **WHEN** `POST /api/campaigns` is called with a name exceeding 200 characters
- **THEN** the server returns HTTP 422

---

### Requirement: Character mutation endpoints validate input

The system SHALL validate request bodies on `POST /api/campaigns/:id/characters` and `PUT /api/campaigns/:id/characters/:slug`.

#### Scenario: Create character with valid data

- **WHEN** `POST /api/campaigns/:id/characters` is called with `{ name: "Aragorn", type: "npc" }`
- **THEN** the character is created successfully

#### Scenario: Create character with missing name rejected

- **WHEN** `POST /api/campaigns/:id/characters` is called with `{ type: "npc" }`
- **THEN** the server returns HTTP 422

---

### Requirement: Entity mutation endpoints validate input

The system SHALL validate request bodies on `POST /api/campaigns/:id/entities` and `PUT /api/campaigns/:id/entities/:slug`.

#### Scenario: Create entity with valid data

- **WHEN** `POST /api/campaigns/:id/entities` is called with `{ name: "Tavern", type: "location" }`
- **THEN** the entity is created successfully

#### Scenario: Entity visibility must be a valid enum value

- **WHEN** `PUT /api/campaigns/:id/entities/:slug` is called with `{ visibility: "invalid" }`
- **THEN** the server returns HTTP 422

#### Scenario: Entity name cannot be empty

- **WHEN** `POST /api/campaigns/:id/entities` is called with `{ name: "", type: "location" }`
- **THEN** the server returns HTTP 422

---

### Requirement: Relation mutation endpoints validate attitude range

The system SHALL validate the `attitude` field on `POST /api/campaigns/:id/relations` and `PUT /api/campaigns/:id/relations/:relationId` to be an integer between -100 and +100.

#### Scenario: Relation with valid attitude

- **WHEN** a relation is created with `{ attitude: 50, ... }`
- **THEN** the relation is created successfully

#### Scenario: Relation with out-of-range attitude rejected

- **WHEN** a relation is created with `{ attitude: 200 }`
- **THEN** the server returns HTTP 422

#### Scenario: Relation with non-integer attitude rejected

- **WHEN** a relation is created with `{ attitude: "friendly" }`
- **THEN** the server returns HTTP 422

---

### Requirement: Transaction endpoints validate amounts

The system SHALL validate the `amount` field on `POST /api/campaigns/:id/transactions` to be a positive number.

#### Scenario: Transaction with valid amount

- **WHEN** a transaction is created with `{ amount: 100, ... }`
- **THEN** the transaction is created successfully

#### Scenario: Transaction with negative amount rejected

- **WHEN** a transaction is created with `{ amount: -50 }`
- **THEN** the server returns HTTP 422

#### Scenario: Transaction with zero amount rejected

- **WHEN** a transaction is created with `{ amount: 0 }`
- **THEN** the server returns HTTP 422

---

### Requirement: All remaining POST/PUT/PATCH endpoints validate input

The system SHALL add Zod validation schemas to every mutating endpoint, including but not limited to: sessions, quests, calendars, calendar events, maps, map pins, map layers, map regions, organizations, organization members, inventories, inventory items, inventory transfers, items, shops, shop buy/sell/stock/withdraw, tags, entity types, templates, arcs, chapters, timelines, timeline events, session groups, session decisions, session attendance, session content, character abilities, character connections, character stats, character folders, relation types, rolls, currency conversion, scan-mentions, invites, API keys, join, and member permissions.

#### Scenario: Session create validates required fields

- **WHEN** `POST /api/campaigns/:id/sessions` is called with an empty body
- **THEN** the server returns HTTP 422

#### Scenario: Quest update validates fields

- **WHEN** `PUT /api/campaigns/:id/quests/:slug` is called with `{ status: "invalid_status" }`
- **THEN** the server returns HTTP 422

#### Scenario: Calendar event validates date fields

- **WHEN** `POST /api/campaigns/:id/calendars/:calendarId/events` is called with `{ day: "not-a-number" }`
- **THEN** the server returns HTTP 422

---

### Requirement: LIKE wildcard characters are escaped in search parameters

The system SHALL escape `%` and `_` characters in search query parameters before using them in SQL `LIKE` clauses. An `escapeLike` utility in `server/utils/sanitize.ts` SHALL handle this.

#### Scenario: Search with normal text works as before

- **WHEN** `GET /api/campaigns/:id/entities?search=dragon` is called
- **THEN** entities with "dragon" in the name are returned

#### Scenario: Search with % character is escaped

- **WHEN** `GET /api/campaigns/:id/entities?search=100%25` (decoded: `100%`) is called
- **THEN** only entities with literal "100%" in the name are returned, not all entities

#### Scenario: Search with \_ character is escaped

- **WHEN** `GET /api/campaigns/:id/characters?search=Zak_` is called
- **THEN** only characters with literal "Zak\_" in the name are returned, not "Zako" or "Zakb"
