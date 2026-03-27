## ADDED Requirements

### Requirement: CLI package structure

The system SHALL provide a standalone CLI package at `cli/` in the repository root with its own `package.json`, runnable as `npx aleph-cli` or via a globally installed `aleph` command. The package SHALL NOT bundle any Nuxt, Vue, or server-side code.

#### Scenario: CLI is runnable after install
- **WHEN** a user runs `node cli/bin/aleph.js --help`
- **THEN** the CLI prints a top-level help message listing all available command groups and exits with code 0

#### Scenario: CLI is runnable via npm script
- **WHEN** a user runs `npm run aleph -- --help` from the repo root
- **THEN** the CLI help is printed

---

### Requirement: Configuration management

The CLI SHALL store the target server URL and authentication token in `~/.aleph/config.json`. Configuration SHALL be readable from environment variables `ALEPH_URL` and `ALEPH_TOKEN` as overrides.

#### Scenario: Set config via command
- **WHEN** a user runs `aleph config set --url http://localhost:3000 --token abc123`
- **THEN** `~/.aleph/config.json` is written with `{ "url": "...", "token": "..." }`
- **AND** the CLI exits with code 0

#### Scenario: Show current config
- **WHEN** a user runs `aleph config show`
- **THEN** the current URL and a masked token (`abc***`) are printed to stdout

#### Scenario: Missing config gives clear error
- **WHEN** a user runs any data command without config set
- **THEN** an error message directing them to run `aleph login` is printed to stderr
- **AND** the CLI exits with code 1

#### Scenario: Environment variable override
- **WHEN** `ALEPH_URL` and `ALEPH_TOKEN` are set in the environment
- **THEN** they take precedence over `~/.aleph/config.json` values

---

### Requirement: Authentication via API token

The system SHALL provide a `POST /api/auth/token` server endpoint that accepts `{ email, password }` and returns `{ token }` — a long-lived bearer token for CLI use. The CLI SHALL use this token as `Authorization: Bearer <token>` on all requests.

#### Scenario: Login stores token
- **WHEN** a user runs `aleph login` and provides valid credentials
- **THEN** the token is stored in `~/.aleph/config.json`
- **AND** a success message is printed to stdout
- **AND** the CLI exits with code 0

#### Scenario: Login with invalid credentials
- **WHEN** a user runs `aleph login` with wrong password
- **THEN** an error is printed to stderr
- **AND** the CLI exits with code 2

#### Scenario: Logout revokes token
- **WHEN** a user runs `aleph logout`
- **THEN** the token is removed from `~/.aleph/config.json`
- **AND** the server-side session is invalidated

---

### Requirement: Structured JSON output

Every CLI command SHALL support a `--json` flag that outputs a JSON object or array to stdout with no color or decoration. Without `--json`, output SHALL be human-readable with color (when stdout is a TTY).

#### Scenario: JSON flag on list command
- **WHEN** a user runs `aleph campaign list --json`
- **THEN** a JSON array of campaign objects is printed to stdout
- **AND** the CLI exits with code 0

#### Scenario: Error in JSON mode
- **WHEN** an API error occurs and `--json` is set
- **THEN** `{ "error": "<message>", "code": <http_status> }` is printed to stdout
- **AND** the CLI exits with code 2

---

### Requirement: Unix exit codes

The CLI SHALL use standard exit codes: `0` for success, `1` for usage/config errors, `2` for API/network errors. Errors SHALL be printed to stderr; data SHALL be printed to stdout.

#### Scenario: Successful command exits 0
- **WHEN** any command completes successfully
- **THEN** the process exits with code 0

#### Scenario: API error exits 2
- **WHEN** the server returns a 4xx or 5xx response
- **THEN** the error message is printed to stderr
- **AND** the process exits with code 2

---

### Requirement: Campaign management commands

The CLI SHALL provide commands to list, create, show, and delete campaigns.

#### Scenario: List campaigns
- **WHEN** a user runs `aleph campaign list`
- **THEN** a table of campaigns (id, name, role) for the authenticated user is printed

#### Scenario: Create campaign
- **WHEN** a user runs `aleph campaign create --name "Curse of Strahd" --theme dark-fantasy`
- **THEN** the campaign is created and its id and slug are printed
- **AND** the CLI exits with code 0

#### Scenario: Show campaign details
- **WHEN** a user runs `aleph campaign show <id>`
- **THEN** the campaign's name, description, theme, and member count are printed

#### Scenario: Delete campaign with confirmation
- **WHEN** a user runs `aleph campaign delete <id>`
- **THEN** the CLI prompts for confirmation before deleting
- **AND** on confirmation, the campaign is deleted and a success message is printed

---

### Requirement: Entity management commands

The CLI SHALL provide commands to list, create, show, edit, and delete wiki entities within a campaign.

#### Scenario: List entities
- **WHEN** a user runs `aleph entity list --campaign <id>`
- **THEN** all entities (name, type, slug) are printed in a table

#### Scenario: Filter entities by type
- **WHEN** a user runs `aleph entity list --campaign <id> --type location`
- **THEN** only entities of type `location` are printed

#### Scenario: Create entity
- **WHEN** a user runs `aleph entity create --campaign <id> --name "Barovia" --type location`
- **THEN** the entity is created and its slug is printed

#### Scenario: Show entity
- **WHEN** a user runs `aleph entity show --campaign <id> barovia`
- **THEN** the entity's name, type, tags, and content (Markdown) are printed

#### Scenario: Edit entity content from stdin
- **WHEN** a user runs `echo "# Barovia\nA cursed land" | aleph entity edit --campaign <id> barovia --stdin`
- **THEN** the entity's content is updated with the piped Markdown

---

### Requirement: Character management commands

The CLI SHALL provide commands to list, create, and show characters within a campaign.

#### Scenario: List characters
- **WHEN** a user runs `aleph character list --campaign <id>`
- **THEN** all characters (name, slug, type) are printed

#### Scenario: Create character
- **WHEN** a user runs `aleph character create --campaign <id> --name "Ireena Kolyana"`
- **THEN** the character is created and its slug is printed

---

### Requirement: Session management commands

The CLI SHALL provide commands to list, create, and show game sessions within a campaign.

#### Scenario: List sessions
- **WHEN** a user runs `aleph session list --campaign <id>`
- **THEN** all sessions (title, date, slug) are printed in reverse chronological order

#### Scenario: Create session
- **WHEN** a user runs `aleph session create --campaign <id> --title "Session 1: Arrival in Barovia" --date 2026-01-15`
- **THEN** the session is created and its slug is printed

---

### Requirement: Search command

The CLI SHALL provide a cross-entity search command.

#### Scenario: Search returns matches
- **WHEN** a user runs `aleph search --campaign <id> "Strahd"`
- **THEN** matching entities, characters, and sessions are printed with their type and slug

#### Scenario: No results
- **WHEN** a user runs `aleph search --campaign <id> "zzznomatch"`
- **THEN** "No results found." is printed and the CLI exits with code 0

---

### Requirement: Dice roll command

The CLI SHALL provide a dice roll command that uses the campaign's roll service.

#### Scenario: Roll dice
- **WHEN** a user runs `aleph roll --campaign <id> 2d6+3`
- **THEN** the formula, individual dice, and total are printed
- **AND** the roll is recorded in the campaign's roll history

#### Scenario: Roll without campaign uses local mode
- **WHEN** a user runs `aleph roll 2d6+3` without `--campaign`
- **THEN** the roll is computed locally and printed without being stored

---

### Requirement: Member management commands

The CLI SHALL provide commands to list members and generate invite links.

#### Scenario: List members
- **WHEN** a user runs `aleph member list --campaign <id>`
- **THEN** all members (name, email, role) are printed

#### Scenario: Generate invite
- **WHEN** a DM runs `aleph member invite --campaign <id> --role player`
- **THEN** an invitation URL is printed to stdout
