# quest-short-description Specification

## Purpose

TBD - created by archiving change add-quest-short-description. Update Purpose after archive.

## Requirements

### Requirement: Quests carry an optional short description

A quest SHALL have an optional `shortDescription` field, separate from `description`, holding a plain-text summary of at most 200 characters. The field SHALL be nullable, and every existing quest SHALL remain valid without it.

#### Scenario: Creating a quest with a short description

- **WHEN** a quest is created with `shortDescription` set to "Symcha Landau ha llegado a Berlín para juzgar el Avatar de Otto."
- **THEN** the value is persisted unchanged
- **AND** reading the quest back returns exactly that string
- **AND** the quest's `description` is unaffected

#### Scenario: Creating a quest without a short description

- **WHEN** a quest is created with no `shortDescription`
- **THEN** the quest is created successfully
- **AND** its `shortDescription` is null

#### Scenario: Clearing a short description

- **GIVEN** a quest whose `shortDescription` is set
- **WHEN** it is updated with `shortDescription` set to null
- **THEN** the stored value becomes null
- **AND** the quest's `description` is unchanged

#### Scenario: Omitting the field leaves it untouched

- **GIVEN** a quest whose `shortDescription` is "Una amenaza de muerte sobre Otto."
- **WHEN** it is updated sending only a new `status` and no `shortDescription` key at all
- **THEN** the `shortDescription` still reads "Una amenaza de muerte sobre Otto."

### Requirement: The short description length limit is enforced by the server

The server SHALL reject any quest create or update whose `shortDescription` exceeds 200 characters, with a validation error. Client-side character counters SHALL NOT be the only enforcement.

#### Scenario: A short description at the limit is accepted

- **WHEN** a quest is created with a `shortDescription` of exactly 200 characters
- **THEN** the request succeeds
- **AND** the stored value is 200 characters long

#### Scenario: A short description over the limit is rejected

- **WHEN** a quest is created with a `shortDescription` of 201 characters
- **THEN** the server responds with a validation error
- **AND** no quest is created

#### Scenario: The limit is rejected on update too, and nothing is written

- **GIVEN** an existing quest whose `shortDescription` is "Texto corto."
- **WHEN** an update sends a `shortDescription` of 201 characters
- **THEN** the server responds with a validation error
- **AND** the stored `shortDescription` still reads "Texto corto."

### Requirement: The length limit has a single definition

The 200-character limit SHALL be declared in exactly one module, shared by the server validation schema, the form's character counter, and the tests. No layer SHALL hard-code the number independently.

#### Scenario: Every layer reads the same constant

- **WHEN** the shared limit constant is changed to a different number
- **THEN** the server's validation schema enforces the new number
- **AND** the form's character counter reports against the new number
- **AND** no other occurrence of the old number remains in the quest short-description code paths

### Requirement: The short description is plain text and is never interpreted as markdown

The short description SHALL be rendered as literal text wherever it is shown. The system SHALL NOT pass it through a markdown renderer nor through the excerpt flattener.

#### Scenario: Markdown syntax is shown literally rather than rendered

- **GIVEN** a quest whose `shortDescription` is "Un **objeto** atravesó las guardas"
- **WHEN** the quest appears in the quests list
- **THEN** the reader sees the asterisks as written
- **AND** no `<strong>` element is produced from that text

### Requirement: The short description survives a campaign export and re-import

A campaign export SHALL include each quest's `shortDescription`, and importing that export SHALL restore it unchanged.

#### Scenario: Round-tripping a campaign preserves the field

- **GIVEN** a campaign containing a quest whose `shortDescription` is "Symcha Landau reclama juzgar el Avatar de Otto."
- **WHEN** the campaign is exported and the export is imported as a new campaign
- **THEN** the imported quest's `shortDescription` reads "Symcha Landau reclama juzgar el Avatar de Otto."

#### Scenario: A quest without a short description round-trips as null

- **GIVEN** a campaign containing a quest whose `shortDescription` is null
- **WHEN** the campaign is exported and re-imported
- **THEN** the imported quest's `shortDescription` is null
- **AND** the import does not fail
