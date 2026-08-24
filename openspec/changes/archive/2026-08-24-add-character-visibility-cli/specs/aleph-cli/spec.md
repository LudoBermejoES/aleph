## ADDED Requirements

### Requirement: Character CLI visibility control

The `character create` and `character update` CLI commands SHALL accept a `--visibility <vis>` option that is passed through to the server's `visibility` field on `POST`/`PUT /api/campaigns/[id]/characters`, matching the option already available on `organization create`/`organization edit`. The `character list` and `character show` commands SHALL include `visibility` in their output.

#### Scenario: Creating a character with an explicit visibility

- **WHEN** a DM runs `character create --campaign <id> --name "Hidden Villain" --visibility dm_only`
- **THEN** the CLI sends `visibility: "dm_only"` in the POST body and the created character is returned with `visibility: "dm_only"`

#### Scenario: Updating an existing character's visibility

- **WHEN** a DM runs `character update <slug> --campaign <id> --visibility private`
- **THEN** the CLI sends `visibility: "private"` in the PUT body and the character's visibility is updated to `private`

#### Scenario: Server rejects an invalid visibility value

- **WHEN** a user runs `character create --campaign <id> --name "X" --visibility not-a-real-value`
- **THEN** the CLI does not validate the value locally and forwards it to the server, which returns a validation error that the CLI prints to the user

#### Scenario: Listing and showing characters includes visibility

- **WHEN** a user runs `character list --campaign <id>` or `character show <slug> --campaign <id>`
- **THEN** the output includes each character's current `visibility` value
