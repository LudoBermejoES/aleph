## ADDED Requirements

### Requirement: CLI session update subcommand

`aleph session update <slug> --campaign <id>` SHALL update session metadata. Supported options: `--title <title>`, `--date <YYYY-MM-DD>`, `--status planned|active|completed|cancelled`, `--group <slug>`. At least one option must be provided. Calls `PUT /api/campaigns/:id/sessions/:slug`. Outputs success confirmation.

#### Scenario: Update session title

GIVEN a valid session slug and campaign id
WHEN `aleph session update my-session --campaign <id> --title "New Title"` is run
THEN the session title is updated
AND "Session updated." is printed

#### Scenario: No options provided

WHEN `aleph session update my-session --campaign <id>` is run with no update options
THEN an error "Provide at least one field to update" is printed
AND the command exits with code 1

### Requirement: CLI session content get subcommand

`aleph session content get <slug> --campaign <id> [--type manual_notes|ai_notes|summary]` SHALL fetch session content. Without `--type`, all three types are shown in labeled sections. With `--type`, only that type's content is printed to stdout (suitable for piping). Calls `GET /api/campaigns/:id/sessions/:slug/content`.

#### Scenario: Get all content types

GIVEN a session with manual_notes and summary content
WHEN `aleph session content get my-session --campaign <id>` is run
THEN all three sections are printed with their labels and content

#### Scenario: Get single content type for piping

GIVEN a session with ai_notes content
WHEN `aleph session content get my-session --campaign <id> --type ai_notes` is run
THEN only the ai_notes text is printed (no label, suitable for redirect to file)

### Requirement: CLI session content set subcommand

`aleph session content set <slug> --campaign <id> --type manual_notes|ai_notes|summary [--file <path>]` SHALL update a content type. If `--file` is provided, reads content from the file. Otherwise reads from stdin. Calls `PUT /api/campaigns/:id/sessions/:slug/content`. Outputs "Content updated."

#### Scenario: Set content from file

GIVEN a markdown file at notes.md
WHEN `aleph session content set my-session --campaign <id> --type manual_notes --file notes.md` is run
THEN the manual_notes content is updated with the file contents
AND "Content updated." is printed

#### Scenario: Set content from stdin

WHEN `echo "quick note" | aleph session content set my-session --campaign <id> --type manual_notes` is run
THEN the manual_notes content is updated with "quick note"

### Requirement: CLI session attendance subcommand

`aleph session attendance set <slug> --campaign <id> --status accepted|declined|tentative|pending` SHALL update the authenticated user's RSVP. Calls `PATCH /api/campaigns/:id/sessions/:slug/attendance` with `{ rsvpStatus }`. Outputs "Attendance updated."

#### Scenario: Player sets own RSVP

GIVEN a valid API key for a campaign member
WHEN `aleph session attendance set my-session --campaign <id> --status accepted` is run
THEN the user's rsvpStatus is updated to accepted
AND "Attendance updated." is printed

### Requirement: CLI session-group update subcommand

`aleph session-group update <slug> --campaign <id> [--name <name>] [--description <desc>]` SHALL update a session group. Calls `PUT /api/campaigns/:id/session-groups/:slug`. At least one option required.

#### Scenario: Update group name

GIVEN a valid group slug
WHEN `aleph session-group update my-group --campaign <id> --name "New Name"` is run
THEN the group name is updated
AND "Session group updated." is printed
