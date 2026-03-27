## ADDED Requirements

### Requirement: character connect subcommand

The CLI SHALL expose `aleph character connect <slug>` to create a character→entity connection.

#### Scenario: connect subcommand registered

- **WHEN** user runs `aleph character connect --help`
- **THEN** the CLI shows usage for the connect subcommand with `--campaign`, `--target`, `--label`, `--description`, `--json` options

### Requirement: character connections subcommand

The CLI SHALL expose `aleph character connections <slug>` to list connections.

#### Scenario: connections subcommand registered

- **WHEN** user runs `aleph character connections --help`
- **THEN** the CLI shows usage with `--campaign` and `--json` options

### Requirement: relation top-level command

The CLI SHALL expose a top-level `aleph relation` command with `create`, `list`, and `delete` subcommands.

#### Scenario: relation command registered

- **WHEN** user runs `aleph relation --help`
- **THEN** the CLI shows the relation command with create, list, delete subcommands

### Requirement: skill files updated

Both `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` SHALL document the new character connect, character connections, relation create, relation list, and relation delete commands with their full option signatures.

#### Scenario: skill version bumped

- **WHEN** new commands are added
- **THEN** the `version` field in both skill file frontmatters is incremented
