## MODIFIED Requirements

### Requirement: Arc & Chapter CLI Commands

The CLI SHALL provide commands to list, create, update, and delete arcs and chapters within a
campaign. Arc and chapter ordering SHALL be settable from the CLI via a `--sort-order <n>`
option on `arc create`, `arc update`, `chapter create`, and `chapter update`, sent to the
server as a numeric `sortOrder`. `chapter create --arc <arc>` SHALL accept either an arc slug
or an arc id. `chapter list` SHALL work without an `--arc` option. Creation commands SHALL
print the slug the server generated, never an empty or `undefined` slug.

#### Scenario: List arcs

- GIVEN the user is authenticated
- WHEN the user runs `aleph arc list --campaign <id>`
- THEN the CLI displays a table of arcs with slug, name, status, and sort order
- AND the arcs appear in ascending `sortOrder` order as returned by `GET /api/campaigns/:id/arcs`

#### Scenario: Create an arc

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph arc create --campaign <id> --name "The Dragon War"`
- THEN the server creates the arc
- AND the CLI prints a success message containing the arc's real slug `the-dragon-war`

#### Scenario: Create an arc at a specific sort order

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph arc create --campaign <id> --name "Act IV" --sort-order 3`
- THEN the CLI sends `sortOrder: 3` as a number in the POST body
- AND the created arc has `sortOrder` 3 rather than the default 0

#### Scenario: Reorder an existing arc

- GIVEN the user is authenticated and an arc `act-ii` exists with `sortOrder` 0
- WHEN the user runs `aleph arc update --campaign <id> --slug act-ii --sort-order 1`
- THEN the CLI sends `sortOrder: 1` as a number in the PUT body
- AND `aleph arc list --campaign <id>` shows `act-ii` in its new position

#### Scenario: Non-numeric sort order is rejected locally

- GIVEN the user is authenticated
- WHEN the user runs `aleph arc create --campaign <id> --name "Act V" --sort-order abc`
- THEN the CLI prints an error to stderr without sending a request
- AND exits with a non-zero code

#### Scenario: Update an arc

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph arc update --campaign <id> --slug the-dragon-war --status active`
- THEN the server updates the arc
- AND the CLI prints a success message

#### Scenario: Delete an arc

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph arc delete --campaign <id> --slug the-dragon-war`
- THEN the CLI prompts for confirmation unless `--yes` was passed
- AND on confirmation the server deletes the arc

#### Scenario: List chapters across a whole campaign

- GIVEN the user is authenticated and the campaign has arcs with chapters
- WHEN the user runs `aleph chapter list --campaign <id>`
- THEN the CLI reads `GET /api/campaigns/:id/arcs` and flattens each arc's nested chapters
- AND displays a table of chapters with slug, name, arc name, and sort order
- AND the command succeeds instead of failing with HTTP 400

#### Scenario: List chapters of one arc

- GIVEN the user is authenticated and arc `act-i` has chapters
- WHEN the user runs `aleph chapter list --campaign <id> --arc act-i`
- THEN only chapters belonging to `act-i` are displayed, in ascending sort order

#### Scenario: Create a chapter addressed by arc slug

- GIVEN the user is authenticated and has co_dm or higher role and arc `act-i` exists
- WHEN the user runs `aleph chapter create --campaign <id> --name "The Siege" --arc act-i`
- THEN the CLI resolves `act-i` to its arc id and sends that as `arcId`
- AND the server creates the chapter
- AND the CLI prints a success message containing the chapter's real slug `the-siege`

#### Scenario: Create a chapter addressed by arc id

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph chapter create --campaign <id> --name "The Siege" --arc <arcId>`
- THEN the value is passed through as `arcId` because no arc slug matches it
- AND the server creates the chapter

#### Scenario: Create a chapter with an unknown arc reference

- GIVEN the user is authenticated
- WHEN the user runs `aleph chapter create --campaign <id> --name "The Siege" --arc nope`
- THEN the CLI or server reports that the arc was not found
- AND the CLI exits with a non-zero code

#### Scenario: Reorder a chapter

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph chapter update --campaign <id> --slug the-siege --sort-order 2`
- THEN the CLI sends `sortOrder: 2` as a number in the PUT body
- AND the chapter's position within its arc changes accordingly

#### Scenario: Delete a chapter

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph chapter delete --campaign <id> --slug the-siege`
- THEN the CLI prompts for confirmation unless `--yes` was passed
- AND on confirmation the server deletes the chapter

## ADDED Requirements

### Requirement: Assign a session to an arc and chapter from the CLI

The CLI SHALL allow a session's narrative arc and chapter to be set, changed, and unset
without any hand-built HTTP request. `session update <slug>` and `session create` SHALL each
accept `--arc <slug>` and `--chapter <slug>`, which are sent to the server as `arcSlug` and
`chapterSlug` for server-side resolution. Passing an empty value to `--arc` MUST unset the
session's arc, and passing an empty value to `--chapter` MUST unset only the chapter. The
"provide at least one field to update" guard in `session update` MUST count `--arc` and
`--chapter` as fields.

#### Scenario: Assign a session to an arc

- GIVEN the user is authenticated with a valid API key and has co_dm or higher role
- AND arc `act-i` exists in the campaign
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i`
- THEN the CLI sends `PUT /api/campaigns/:id/sessions/session-5` with body `{ arcSlug: "act-i" }`
- AND the CLI prints a success message and exits with code 0

#### Scenario: Assign a session to an arc and chapter together

- GIVEN the user is authenticated and chapter `the-market` belongs to arc `act-i`
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i --chapter the-market`
- THEN the CLI sends `{ arcSlug: "act-i", chapterSlug: "the-market" }`
- AND the session ends up in both the arc and the chapter

#### Scenario: Assign only a chapter and let the arc be derived

- GIVEN the user is authenticated and chapter `the-market` belongs to arc `act-i`
- WHEN the user runs `aleph session update session-5 --campaign <id> --chapter the-market`
- THEN the CLI sends `{ chapterSlug: "the-market" }` with no `arcSlug`
- AND the session's arc becomes `act-i` because the server derives it from the chapter

#### Scenario: Unset a session's arc

- GIVEN the user is authenticated and session `session-5` is assigned to arc `act-i`
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc ''`
- THEN the CLI sends `{ arcSlug: "" }`
- AND the session has no arc and no chapter afterwards

#### Scenario: Unset only a session's chapter

- GIVEN the user is authenticated and session `session-5` is in arc `act-i`, chapter `the-market`
- WHEN the user runs `aleph session update session-5 --campaign <id> --chapter ''`
- THEN the session keeps arc `act-i` and has no chapter

#### Scenario: Unknown arc slug reports a clear error

- GIVEN the user is authenticated and no arc `nonexistent` exists in the campaign
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc nonexistent`
- THEN the CLI prints the server's `Arc "nonexistent" not found` message to stderr
- AND exits with a non-zero code
- AND the session is left unchanged

#### Scenario: Create a session already assigned to an arc

- GIVEN the user is authenticated and has co_dm or higher role and arc `act-i` exists
- WHEN the user runs `aleph session create --campaign <id> --title "Session 9" --arc act-i`
- THEN the CLI includes `arcSlug: "act-i"` in the POST body
- AND the created session is in arc `act-i`

#### Scenario: Arc and chapter count as updatable fields

- GIVEN the user is authenticated
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i` with no other flags
- THEN the CLI does not print the "provide at least one field to update" error
- AND the request is sent

#### Scenario: session update help advertises the new options

- WHEN the user runs `aleph session update --help`
- THEN the options list includes `--arc <slug>` and `--chapter <slug>`
- AND each notes that an empty string unsets the value

#### Scenario: Unauthenticated assignment is refused

- GIVEN no API key is configured and no session cookie is present
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i`
- THEN the CLI prints an authentication error to stderr
- AND exits with a non-zero code

### Requirement: Filter and display sessions by arc in the CLI

The CLI SHALL make a session's arc membership visible and filterable. `session list` MUST
accept `--arc <slug>`, forwarded to the server as an `arcSlug` query parameter so filtering
happens before pagination, and its human-readable table MUST include an arc column. `session
show` MUST display the session's arc and chapter names.

#### Scenario: List only the sessions in one arc

- GIVEN the user is authenticated and 12 of the campaign's 73 sessions are in arc `act-i`
- WHEN the user runs `aleph session list --campaign <id> --arc act-i --limit 0`
- THEN the CLI requests `GET /api/campaigns/:id/sessions?arcSlug=act-i&...`
- AND exactly those 12 sessions are listed

#### Scenario: Arc column appears in the session table

- GIVEN the user is authenticated and sessions are assigned to arcs
- WHEN the user runs `aleph session list --campaign <id>`
- THEN each row shows the arc name from the response's `arcName` field, blank when unassigned
- AND raw arc UUIDs are not shown in the table

#### Scenario: Arc filter combines with the group filter and pagination

- GIVEN the user is authenticated
- WHEN the user runs `aleph session list --campaign <id> --arc act-i --group main-table --page 2`
- THEN the CLI forwards `arcSlug`, `groupSlug`, and the pagination params together
- AND the printed page metadata reflects the filtered total, not the campaign total

#### Scenario: Filtering by an arc with no sessions

- GIVEN the user is authenticated and arc `act-iv` has no sessions
- WHEN the user runs `aleph session list --campaign <id> --arc act-iv`
- THEN the CLI prints an empty table and exits with code 0

#### Scenario: JSON output carries arc and chapter fields

- GIVEN the user is authenticated
- WHEN the user runs `aleph session list --campaign <id> --arc act-i --json`
- THEN each session object includes `arcId`, `arcName`, `chapterId`, and `chapterName`

#### Scenario: session show displays arc and chapter

- GIVEN the user is authenticated and session `session-5` is in arc `act-i`, chapter `the-market`
- WHEN the user runs `aleph session show session-5 --campaign <id>`
- THEN the output includes the arc name `Act I` and the chapter name `The Market`

#### Scenario: Unauthenticated list is refused

- GIVEN no API key is configured and no session cookie is present
- WHEN the user runs `aleph session list --campaign <id> --arc act-i`
- THEN the CLI prints an authentication error to stderr and exits with a non-zero code
