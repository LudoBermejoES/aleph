## ADDED Requirements

### Requirement: CLI command to mark session attendance

The CLI SHALL provide `aleph session attendance mark <session-slug>` to record which characters attended (or were absent from) a session, calling the bulk attendance endpoint.

```
aleph session attendance mark <session-slug> \
  --campaign <id> \
  --characters <slug1,slug2,...>
  [--absent]
  [--json]
```

- `--characters`: Comma-separated list of character slugs (required).
- `--absent`: When present, marks the listed characters as NOT attended. Default marks them as attended.
- `--json`: Output raw JSON response.

#### Scenario: Mark multiple characters as attended

- **GIVEN** the user is authenticated with a valid API key
- **WHEN** `aleph session attendance mark session-01 --campaign abc --characters sim-sim,laughlin` is run
- **THEN** the CLI sends `PUT /api/campaigns/abc/sessions/session-01/attendance/bulk` with `{ "attendees": ["sim-sim", "laughlin"], "attended": true }`
- **AND** prints a success message listing updated characters

#### Scenario: Mark characters as absent with --absent flag

- **WHEN** the command is run with `--absent`
- **THEN** the payload includes `"attended": false`

#### Scenario: Unresolved slugs are reported

- **WHEN** the server response contains `unresolved: ["ghost"]`
- **THEN** the CLI prints a warning: `Warning: could not resolve characters: ghost`

#### Scenario: --json flag outputs raw response

- **WHEN** the command is run with `--json`
- **THEN** the CLI prints the raw JSON from the server to stdout

#### Scenario: Missing --characters exits with error

- **WHEN** the command is run without `--characters`
- **THEN** the CLI prints an error to stderr and exits with code 1
