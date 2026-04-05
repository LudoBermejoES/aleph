## ADDED Requirements

### Requirement: Session can be deleted via API

The system SHALL provide `DELETE /api/campaigns/:id/sessions/:slug` to permanently remove a session and all its associated data (attendance, content, decisions). The requester SHALL have co_dm or above role on the campaign.

#### Scenario: Successful deletion by DM

- **WHEN** a DM sends `DELETE /api/campaigns/:id/sessions/:slug` with a valid API key
- **THEN** the session is deleted, all child records (session_contents, session_attendance, decisions) are cascade-deleted, and the response is `{ success: true }`

#### Scenario: Non-existent session returns 404

- **WHEN** `DELETE /api/campaigns/:id/sessions/no-such-slug` is called
- **THEN** the server returns HTTP 404

#### Scenario: Insufficient role returns 403

- **WHEN** a player or editor calls `DELETE /api/campaigns/:id/sessions/:slug`
- **THEN** the server returns HTTP 403

#### Scenario: Unauthenticated request returns 401

- **WHEN** `DELETE /api/campaigns/:id/sessions/:slug` is called without a valid API key or session
- **THEN** the server returns HTTP 401

#### Scenario: Session content is cascade-deleted

- **WHEN** a session with `session_contents` records is deleted
- **THEN** all `session_contents` rows for that session are also deleted

---

### Requirement: Session can be deleted via CLI

The system SHALL provide an `aleph session delete <campaignId> <slug>` CLI subcommand. Without `--yes`, it SHALL prompt for confirmation. With `--yes`, it SHALL delete immediately.

#### Scenario: Delete with --yes flag

- **WHEN** `aleph session delete <campaignId> <slug> --yes` is run
- **THEN** the session is deleted and the CLI prints a success message

#### Scenario: Delete without --yes prompts for confirmation

- **WHEN** `aleph session delete <campaignId> <slug>` is run without `--yes`
- **THEN** the CLI prompts "Are you sure?" before proceeding

#### Scenario: Delete non-existent session shows error

- **WHEN** `aleph session delete <campaignId> non-existent-slug --yes` is run
- **THEN** the CLI prints an error message (404 from server)

---

### Requirement: Session can be deleted from the session detail page

The system SHALL display a delete button on the session detail page (`/campaigns/:id/sessions/:slug`) visible to co_dm and DM roles. Clicking it SHALL show a confirmation dialog before deletion. On confirmation, the session SHALL be deleted and the user SHALL be redirected to the sessions list.

#### Scenario: Delete button shown to DM/co_dm

- **WHEN** a DM or co_dm views a session detail page
- **THEN** a delete button (or menu option) is visible

#### Scenario: Delete button hidden from players/editors

- **WHEN** a player or editor views a session detail page
- **THEN** no delete button is visible

#### Scenario: Confirmation dialog appears before delete

- **WHEN** the DM clicks the delete button
- **THEN** an AlertDialog appears asking for confirmation before deleting

#### Scenario: Confirmed delete redirects to sessions list

- **WHEN** the DM confirms the deletion in the dialog
- **THEN** the session is deleted via API and the user is navigated to `/campaigns/:id/sessions`
