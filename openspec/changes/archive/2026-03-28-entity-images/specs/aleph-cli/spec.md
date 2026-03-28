## ADDED Requirements

### Requirement: Upload entity image via CLI
The CLI SHALL provide an `entity upload-image` command that uploads an image file for a given entity.

#### Scenario: Upload image for entity
- **WHEN** a user runs `aleph entity upload-image --campaign <id> --slug <slug> --file <path>`
- **THEN** the CLI sends a multipart POST to `/api/campaigns/:id/entities/:slug/image` with the file and prints the resulting `imageUrl`

#### Scenario: Upload with --json flag
- **WHEN** the command is run with `--json`
- **THEN** the CLI outputs `{ "imageUrl": "..." }` to stdout

#### Scenario: File not found
- **WHEN** the `--file` path does not exist
- **THEN** the CLI prints an error to stderr and exits with code 1

#### Scenario: Server returns error
- **WHEN** the server responds with a non-2xx status
- **THEN** the CLI prints the server error message to stderr and exits with code 2
