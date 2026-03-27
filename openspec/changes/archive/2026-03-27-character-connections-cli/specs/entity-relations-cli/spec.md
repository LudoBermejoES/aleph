## ADDED Requirements

### Requirement: relation create command
The CLI SHALL provide a `relation create` subcommand that creates a bidirectional relation between two entities.

#### Scenario: create relation with slugs
- **WHEN** user runs `aleph relation create --campaign <id> --source diana --target red-dragon --forward "hunts" --reverse "is hunted by"`
- **THEN** the CLI resolves both slugs to entity UUIDs via `GET /api/campaigns/<id>/entities/<slug>`
- **THEN** POSTs to `/api/campaigns/<id>/relations` with `{ sourceEntityId, targetEntityId, forwardLabel, reverseLabel }`
- **THEN** prints a success message with the new relation ID

#### Scenario: create with attitude score
- **WHEN** user passes `--attitude <number>` between -100 and 100
- **THEN** the `attitude` field is included in the request body

#### Scenario: create with description
- **WHEN** user passes `--description <text>`
- **THEN** the `description` field is included in the request body

#### Scenario: JSON output
- **WHEN** user passes `--json`
- **THEN** the CLI prints `{ "id": "<uuid>" }` as JSON

#### Scenario: slug resolution failure
- **WHEN** a source or target slug does not exist in the campaign
- **THEN** the CLI exits with code 2 and prints a descriptive error to stderr

### Requirement: relation list command
The CLI SHALL provide a `relation list` subcommand that lists entity relations in a campaign.

#### Scenario: list all campaign relations
- **WHEN** user runs `aleph relation list --campaign <id>`
- **THEN** the CLI prints all relations with columns: id, source, target, forwardLabel, attitude

#### Scenario: filter by entity slug
- **WHEN** user runs `aleph relation list --campaign <id> --entity diana`
- **THEN** the CLI resolves the slug to an entity ID and passes `?entity_id=<id>` to the API
- **THEN** only relations involving that entity are shown

#### Scenario: JSON output
- **WHEN** user passes `--json`
- **THEN** the CLI prints the raw relation array as JSON

### Requirement: relation delete command
The CLI SHALL provide a `relation delete <relationId>` subcommand that deletes a relation by UUID.

#### Scenario: delete a relation
- **WHEN** user runs `aleph relation delete <uuid> --campaign <id>`
- **THEN** the CLI sends DELETE to `/api/campaigns/<id>/relations/<uuid>`
- **THEN** prints a success message

#### Scenario: confirmation prompt
- **WHEN** user runs without `--yes`
- **THEN** the CLI prompts for confirmation before deleting

#### Scenario: skip confirmation
- **WHEN** user passes `--yes`
- **THEN** the CLI deletes without prompting
