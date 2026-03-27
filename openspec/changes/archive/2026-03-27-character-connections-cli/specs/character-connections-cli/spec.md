## ADDED Requirements

### Requirement: character connect command
The CLI SHALL provide a `character connect <slug>` subcommand that creates a directional connection from a character to a target entity.

#### Scenario: connect character to entity by slug
- **WHEN** user runs `aleph character connect diana --campaign <id> --target red-dragon --label "hunts"`
- **THEN** the CLI resolves `diana` to its character slug (used in URL) and resolves `red-dragon` slug to its entity UUID, then POSTs to `/api/campaigns/<id>/characters/diana/connections` with `{ targetEntityId, label }`
- **THEN** the CLI prints a success message with the new connection ID

#### Scenario: connect with description
- **WHEN** user runs `aleph character connect diana --campaign <id> --target red-dragon --label "hunts" --description "Has been tracking it for years"`
- **THEN** the CLI includes `description` in the request body

#### Scenario: connect with JSON output
- **WHEN** user runs the connect command with `--json`
- **THEN** the CLI prints `{ "id": "<uuid>" }` as JSON

#### Scenario: target slug not found
- **WHEN** the target entity slug does not resolve to a known entity
- **THEN** the CLI exits with code 2 and prints an error to stderr

### Requirement: character connections list command
The CLI SHALL provide a `character connections <slug>` subcommand that lists all outgoing connections for a character.

#### Scenario: list connections
- **WHEN** user runs `aleph character connections diana --campaign <id>`
- **THEN** the CLI prints a table of connections with columns: id, targetEntityId, label, description

#### Scenario: JSON output
- **WHEN** user runs with `--json`
- **THEN** the CLI prints the raw connection array as JSON
