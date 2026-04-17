## ADDED Requirements

### Requirement: CLI `character update` accepts demographic flags

The `aleph-cli` `character update <slug>` command SHALL accept `--birth-year <n>`, `--death-year <n>`, and `--gender <string>` flags, and SHALL send the provided values in the PUT payload. Omitted flags MUST NOT be sent (to preserve the server's partial-update semantics).

#### Scenario: Update birth year from the CLI

- **GIVEN** an authenticated CLI user with a valid API key
- **WHEN** they run `aleph-cli character update agnus --birth-year 1970`
- **THEN** the CLI sends `PUT /api/campaigns/[id]/characters/agnus` with a body containing `birthYear: 1970` and no other demographic fields; the command prints the updated character

#### Scenario: Update all three demographic fields at once

- **WHEN** a user runs `aleph-cli character update agnus --birth-year 1970 --death-year 2042 --gender male`
- **THEN** the PUT body contains all three fields and the command prints the updated character

#### Scenario: Nullable death year via explicit empty string

- **WHEN** a user runs `aleph-cli character update agnus --death-year ""`
- **THEN** the PUT body contains `deathYear: null`

#### Scenario: Unauthenticated CLI rejected

- **GIVEN** a CLI user with no stored API key
- **WHEN** they run `character update agnus --birth-year 1970`
- **THEN** the CLI prints an authentication error and exits non-zero without sending any PUT

### Requirement: CLI `character family-add`

A new subcommand `aleph-cli character family-add <slug> --type <parent|child|spouse|sibling> --target <targetSlug>` SHALL create a family link by calling `POST /api/campaigns/[id]/characters/<slug>/family`. On success it SHALL print the created relation's id and a confirmation; on error it SHALL print the server's error message and exit non-zero.

#### Scenario: Add a parent link

- **WHEN** a user runs `aleph-cli character family-add zen --type parent --target agnus`
- **THEN** the CLI POSTs `{ type: 'parent', targetCharacterSlug: 'agnus' }`, prints the new relation id, and exits zero

#### Scenario: Reject missing flags

- **WHEN** a user runs `character family-add zen --type parent` (without `--target`)
- **THEN** the CLI exits with a usage error and does not make a network call

#### Scenario: Invalid type value

- **WHEN** a user passes `--type cousin`
- **THEN** the CLI exits with a validation error listing the valid values

#### Scenario: Server rejects with cycle error

- **GIVEN** a scenario where the server returns 400 with a cycle error
- **WHEN** the user runs the command
- **THEN** the CLI prints the server's error message and exits non-zero

### Requirement: CLI `character family-remove`

A new subcommand `aleph-cli character family-remove <slug> --relation-id <id>` SHALL delete a family link by calling `DELETE /api/campaigns/[id]/characters/<slug>/family/<id>`.

#### Scenario: Remove an existing link

- **GIVEN** an existing family relation `rel_abc`
- **WHEN** a user runs `character family-remove zen --relation-id rel_abc`
- **THEN** the CLI issues the DELETE and prints a confirmation on 204

#### Scenario: Unknown relation id

- **GIVEN** no such relation exists
- **WHEN** a user runs the command
- **THEN** the server returns 404, the CLI prints an error, and exits non-zero

### Requirement: CLI `character genealogy`

A new subcommand `aleph-cli character genealogy <slug> [--depth N] [--format json|ascii]` SHALL call `GET /api/campaigns/[id]/characters/<slug>/genealogy?depth=N` and render the result. `--format json` prints the raw server payload; `--format ascii` (default) prints an indented text tree where each generation is indented by two spaces and spouses share a line connected by `=`.

#### Scenario: Default ascii output shows the focus and its descendants

- **GIVEN** a focus character with one spouse and two children
- **WHEN** a user runs `character genealogy agnus`
- **THEN** stdout contains a line for Agnus, a `= Andrea` on the same line, and the two children are indented two spaces below

#### Scenario: JSON output is the raw server payload

- **WHEN** a user runs `character genealogy agnus --format json`
- **THEN** stdout is valid JSON matching the server response shape `{ focus, nodes, edges, warnings }`

#### Scenario: Respects --depth

- **WHEN** a user runs `character genealogy agnus --depth 1`
- **THEN** the server is called with `depth=1` and the output is limited accordingly

### Requirement: Skills stay in sync with CLI surface

Both skill files — `docs/claude-skill.md` (shareable) and `.claude/skills/aleph-cli/SKILL.md` (local) — SHALL be updated in the same change that modifies the CLI surface, with the local skill's frontmatter `version` bumped to reflect the change. Both files MUST document the new `family-add`, `family-remove`, `genealogy` subcommands and the `character update` demographic flags.

#### Scenario: Shareable skill documents new commands

- **WHEN** a reader opens `docs/claude-skill.md` after the change lands
- **THEN** the document lists `character family-add`, `character family-remove`, `character genealogy`, and the `--birth-year`/`--death-year`/`--gender` flags on `character update`

#### Scenario: Local skill version bumped

- **WHEN** a reader inspects `.claude/skills/aleph-cli/SKILL.md` after the change
- **THEN** the frontmatter `version` is strictly greater than before the change, and the body mirrors `docs/claude-skill.md` for the new commands
