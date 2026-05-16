## ADDED Requirements

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

### Requirement: Character detail UI displays and edits all four narrative sections

The character detail page SHALL display `description`, `backstory`, `history`, and `current_status` as separate labelled sections, each with a dedicated MarkdownEditor. Sections with null content SHALL show an empty editor (not hidden). Labels SHALL use i18n keys.

#### Scenario: DM sees four distinct edit sections on character page

- **GIVEN** a character with all four fields populated
- **WHEN** a DM navigates to the character detail page
- **THEN** four separate labelled sections are visible: Description, Backstory, History, Current Status
- **AND** each section shows the field's markdown rendered (view mode) or a MarkdownEditor (edit mode)

#### Scenario: DM saves changes to current_status

- **WHEN** a DM edits the Current Status section and saves
- **THEN** a PUT request is sent with only `{ "currentStatus": "<new value>" }`
- **AND** the page reflects the updated content without a full reload
