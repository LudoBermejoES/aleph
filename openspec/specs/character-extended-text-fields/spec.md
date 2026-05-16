### Requirement: Characters have three additional narrative markdown fields

The `characters` table SHALL have three new nullable text columns: `backstory`, `history`, and `current_status`. These fields store markdown and are independent of the existing entity `content` field (physical description).

#### Scenario: New character has null narrative fields by default

- **WHEN** a character is created via `POST /api/campaigns/:id/characters`
- **THEN** `backstory`, `history`, and `current_status` are all `null` in the database

#### Scenario: GET returns all four narrative fields

- **GIVEN** a character with `backstory = "Born in the mountains."`, `history = "Session 1: arrived."`, `current_status = "Wounded."`, and `content = "Tall, red hair."`
- **WHEN** `GET /api/campaigns/:id/characters/:slug` is called
- **THEN** the response includes `description: "Tall, red hair."`, `backstory: "Born in the mountains."`, `history: "Session 1: arrived."`, `currentStatus: "Wounded."`

#### Scenario: GET returns null for unpopulated narrative fields

- **GIVEN** a character where `backstory`, `history`, and `current_status` are all null
- **WHEN** `GET /api/campaigns/:id/characters/:slug` is called
- **THEN** the response includes `backstory: null`, `history: null`, `currentStatus: null`

---

### Requirement: PUT endpoint accepts and persists all three new narrative fields

`PUT /api/campaigns/:id/characters/:slug` SHALL accept optional fields `backstory`, `history`, and `currentStatus` (camelCase). Each is a string or null. Passing a field updates it; omitting it leaves the current value unchanged.

#### Scenario: DM sets backstory on a character

- **GIVEN** a character with `backstory = null`
- **WHEN** `PUT /api/campaigns/:id/characters/:slug` is called with `{ "backstory": "Orphaned at age 5." }` and a valid DM session
- **THEN** the character's `backstory` is updated to `"Orphaned at age 5."`
- **AND** the response returns `{ success: true }`

#### Scenario: DM updates history without touching backstory

- **GIVEN** a character with `backstory = "Born in the mountains."`, `history = "Session 1: arrived."`
- **WHEN** `PUT /api/campaigns/:id/characters/:slug` is called with `{ "history": "Session 1: arrived.\nSession 2: fought the wolf." }`
- **THEN** `history` is updated to the new value
- **AND** `backstory` remains `"Born in the mountains."` unchanged

#### Scenario: DM clears current_status by passing null

- **GIVEN** a character with `currentStatus = "Wounded."`
- **WHEN** `PUT /api/campaigns/:id/characters/:slug` is called with `{ "currentStatus": null }`
- **THEN** `current_status` in the DB is set to `null`

#### Scenario: Unauthenticated request is rejected

- **WHEN** `PUT /api/campaigns/:id/characters/:slug` is called without authentication
- **THEN** the response status is `401`

#### Scenario: Player cannot update narrative fields of another player's character

- **GIVEN** a character owned by player A
- **WHEN** player B sends `PUT` with `{ "backstory": "..." }`
- **THEN** the response status is `403`

---

### Requirement: CLI character update supports new narrative fields

`aleph-cli character update` SHALL accept `--backstory <text>`, `--history <text>`, `--current-status <text>` options, each with a corresponding `--backstory-stdin`, `--history-stdin`, `--current-status-stdin` flag for reading from stdin.

#### Scenario: CLI updates backstory via flag

- **WHEN** `character update <slug> --campaign <id> --backstory "Born in the mountains."` is run
- **THEN** the PUT request includes `{ "backstory": "Born in the mountains." }`
- **AND** the CLI prints a success message

#### Scenario: CLI reads history from stdin

- **WHEN** `character update <slug> --campaign <id> --history-stdin` is run with markdown piped to stdin
- **THEN** the PUT request includes `{ "history": "<piped content>" }`

#### Scenario: CLI rejects conflicting flag and stdin for same field

- **WHEN** `character update <slug> --campaign <id> --history "..." --history-stdin` is run
- **THEN** the CLI exits with an error: `--history and --history-stdin are mutually exclusive`

---

### Requirement: Character detail UI displays all four narrative sections in tabs

The character detail page SHALL display `description`, `backstory`, `history`, and `current_status` in their designated tabs of the tabbed layout introduced by the `character-page-tabs` capability:

- `description` and `currentStatus` are shown in the **Main info** tab.
- `backstory` and `history` are shown in the **Story** tab.

Each section SHALL render the field's markdown using the `MDC` component. Sections whose value is `null` SHALL be hidden (not rendered). Labels SHALL use i18n keys.

The four-section flat layout (single scrollable column, all sections always visible) is replaced by the tabbed layout. Editing these fields remains on the separate character edit page (`/edit`).

#### Scenario: Description is visible in Main info tab

- **GIVEN** a character with a description
- **WHEN** the user is on the Main info tab
- **THEN** the description text is visible with its label

#### Scenario: Current status is visible in Main info tab when not null

- **GIVEN** a character with a `currentStatus` value
- **WHEN** the user is on the Main info tab
- **THEN** the current status text is visible

#### Scenario: Backstory is visible in Story tab

- **GIVEN** a character with a `backstory` value
- **WHEN** the user switches to the Story tab
- **THEN** the backstory text is visible under the Story tab

#### Scenario: History is visible in Story tab

- **GIVEN** a character with a `history` value
- **WHEN** the user is on the Story tab
- **THEN** the history text is visible

#### Scenario: Null sections are hidden

- **GIVEN** a character where `backstory`, `history`, and `currentStatus` are all null
- **WHEN** the user views the Story and Main info tabs
- **THEN** none of those sections are rendered
