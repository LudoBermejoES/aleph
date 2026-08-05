## ADDED Requirements

### Requirement: Nicknames storage

The system SHALL store zero or more nicknames per entity in a dedicated `entity_nicknames` table. Each nickname is a non-empty string unique within an entity (case-insensitive). Nicknames are scoped to a campaign via the entity's campaign membership.

#### Scenario: Add a nickname

- **WHEN** a campaign member with edit rights calls `POST /api/campaigns/[id]/entities/[slug]/nicknames` with body `{ "nickname": "El hermético" }`
- **THEN** the system creates a row in `entity_nicknames` for that entity
- **AND** returns `{ id, entityId, nickname, createdAt }` with status 201

#### Scenario: Duplicate nickname is rejected

- **WHEN** the same nickname (case-insensitive) already exists for that entity
- **THEN** the server returns 409 Conflict

#### Scenario: Empty nickname is rejected

- **WHEN** the body `nickname` field is empty or whitespace-only
- **THEN** the server returns 422 Unprocessable Entity

#### Scenario: List nicknames

- **WHEN** any campaign member calls `GET /api/campaigns/[id]/entities/[slug]/nicknames`
- **THEN** the server returns an array of `{ id, entityId, nickname, createdAt }` ordered by `createdAt` ascending

#### Scenario: Delete a nickname

- **WHEN** a campaign member with edit rights calls `DELETE /api/campaigns/[id]/entities/[slug]/nicknames/[nicknameId]`
- **THEN** the system removes the row and returns 204 No Content

#### Scenario: Delete non-existent nickname

- **WHEN** the `nicknameId` does not exist or belongs to a different entity
- **THEN** the server returns 404 Not Found

### Requirement: Auto-link resolution includes nicknames

The auto-link render pipeline SHALL resolve nickname text to the same entity as the primary name. Matching is case-insensitive with word-boundary enforcement, identical to primary name matching.

#### Scenario: Nickname renders as entity link

- **GIVEN** the entity "Philip Holmes" has nickname "El hermético"
- **WHEN** a content field containing the text "El hermético llegó tarde" is rendered
- **THEN** "El hermético" is replaced with `:entity-link{slug="philip-holmes" name="El hermético" type="character"}`

#### Scenario: Nickname participates in mention scanning

- **GIVEN** the entity "Philip Holmes" has nickname "Phillip"
- **WHEN** the mention scanner processes a session document containing "Phillip habló con Julia"
- **THEN** an `entity_mentions` row is created linking the session entity to `philip-holmes`

#### Scenario: Automaton cache invalidated on nickname change

- **WHEN** a nickname is added or deleted for any entity in a campaign
- **THEN** the automaton cache for that campaign is invalidated so the next render picks up the change

### Requirement: Nickname UI management panel

The entity page SHALL include a panel to view and manage nicknames inline without navigating away.

#### Scenario: View existing nicknames

- **GIVEN** an entity page is open
- **WHEN** the user views the nicknames panel
- **THEN** all current nicknames are displayed as removable chips/tags

#### Scenario: Add a nickname from the UI

- **WHEN** the user types a new nickname in the input field and confirms
- **THEN** the UI calls the create API and the new nickname appears in the list without page reload

#### Scenario: Remove a nickname from the UI

- **WHEN** the user clicks the remove button on a nickname chip
- **THEN** the UI calls the delete API and the chip disappears without page reload

### Requirement: CLI nickname management

The aleph-cli SHALL provide subcommands to list, add, and remove entity nicknames.

#### Scenario: List nicknames via CLI

- **WHEN** the user runs `aleph entity nickname list <slug> --campaign <id>`
- **THEN** the CLI prints each nickname on a separate line (or JSON with `--json`)

#### Scenario: Add a nickname via CLI

- **WHEN** the user runs `aleph entity nickname add <slug> <nickname> --campaign <id>`
- **THEN** the CLI creates the nickname and prints confirmation (or JSON with `--json`)

#### Scenario: Remove a nickname via CLI

- **WHEN** the user runs `aleph entity nickname remove <slug> <nickname> --campaign <id>`
- **THEN** the CLI deletes the nickname by value and prints confirmation
