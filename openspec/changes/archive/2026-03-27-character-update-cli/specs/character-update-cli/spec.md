## ADDED Requirements

### Requirement: CLI character update command
The CLI SHALL provide `aleph character update --campaign <id> <slug> [fields...]` to update one or more character fields via the existing PUT endpoint. At least one field flag MUST be provided.

#### Scenario: Update race and alignment
- **WHEN** the user runs `aleph character update --campaign <id> <slug> --race Human --alignment "Chaotic Good"`
- **THEN** the CLI sends a PUT with `{ race: "Human", alignment: "Chaotic Good" }` and prints a success message

#### Scenario: Update content from flag
- **WHEN** the user runs `aleph character update --campaign <id> <slug> --content "# Bio\n\nSome text"`
- **THEN** the character's markdown content is updated

#### Scenario: Update content from stdin
- **WHEN** the user pipes `cat bio.md | aleph character update --campaign <id> <slug> --stdin`
- **THEN** the full stdin content is sent as the character's markdown content

#### Scenario: No fields provided exits with error
- **WHEN** the user runs `aleph character update --campaign <id> <slug>` with no field flags
- **THEN** the CLI prints an error message and exits with code 1

#### Scenario: --stdin and --content are mutually exclusive
- **WHEN** the user passes both `--content` and `--stdin`
- **THEN** the CLI prints an error and exits with code 1
