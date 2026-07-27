# direct-member-add Specification

## Purpose

Lets a DM or co-DM add an existing registered user straight into a campaign with a chosen role, bypassing the invite-token flow. It is backed by a user search endpoint returning minimal identifying information, a section on the campaign members page beside the invite link generator, and the CLI's `member add` sub-command.

## Requirements

### Requirement: User search

The system SHALL provide an endpoint that allows authenticated users to search for registered accounts by name or partial email, returning minimal identifying information.

#### Scenario: Search by name

- **WHEN** an authenticated user calls `GET /api/users/search?q=<name>`
- **THEN** the system SHALL return a list of users whose `name` contains the query (case-insensitive), each with `id`, `name`, and a redacted email

#### Scenario: Search by exact email

- **WHEN** an authenticated user calls `GET /api/users/search?q=<email>` with a full email address
- **THEN** the system SHALL return the matching user with `id`, `name`, and redacted email

#### Scenario: Partial email redaction

- **WHEN** a search returns users matched by name
- **THEN** the email field SHALL be redacted (e.g., `l***@example.com`), showing only the first character and domain

#### Scenario: Unauthenticated search

- **GIVEN** the request has no valid session or API key
- **WHEN** `GET /api/users/search` is called
- **THEN** the system SHALL return 401 Unauthorized

#### Scenario: Empty query

- **WHEN** `GET /api/users/search` is called with no `q` parameter or an empty string
- **THEN** the system SHALL return 400 Bad Request

#### Scenario: No results

- **WHEN** the query matches no registered users
- **THEN** the system SHALL return an empty array with status 200

### Requirement: Direct campaign member add

The system SHALL allow a campaign co-DM or DM to add an existing registered user directly to the campaign with a specified role, without requiring an invite token.

#### Scenario: Successful direct add

- **GIVEN** the requesting user is co-DM or DM of the campaign
- **WHEN** `POST /api/campaigns/[id]/members/direct` is called with a valid `userId` and `role`
- **THEN** the user SHALL be added as a campaign member with the given role
- **AND** the response SHALL return the new member record with status 201

#### Scenario: Target user already a member

- **GIVEN** the target user is already a member of the campaign
- **WHEN** `POST /api/campaigns/[id]/members/direct` is called with that userId
- **THEN** the system SHALL return 409 Conflict

#### Scenario: Target user does not exist

- **WHEN** `POST /api/campaigns/[id]/members/direct` is called with a userId that does not exist
- **THEN** the system SHALL return 404 Not Found

#### Scenario: Insufficient permissions

- **GIVEN** the requesting user is an editor, player, or visitor of the campaign
- **WHEN** `POST /api/campaigns/[id]/members/direct` is called
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Unauthenticated direct add

- **GIVEN** the request has no valid session or API key
- **WHEN** `POST /api/campaigns/[id]/members/direct` is called
- **THEN** the system SHALL return 401 Unauthorized

#### Scenario: Invalid role

- **WHEN** `POST /api/campaigns/[id]/members/direct` is called with a `role` not in `['co_dm', 'editor', 'player', 'visitor']`
- **THEN** the system SHALL return 400 Bad Request

### Requirement: Direct add UI on members page

The campaign members page SHALL provide a UI section allowing co-DM+ to search for existing users and add them directly, alongside the existing invite link generator.

#### Scenario: Search and add flow

- **GIVEN** the user is co-DM or DM viewing the campaign members page
- **WHEN** they type in the "Add existing user" search field
- **THEN** matching users SHALL appear in a dropdown with name and redacted email
- **AND** selecting a user and choosing a role SHALL call the direct-add endpoint
- **AND** on success the members list SHALL refresh to show the new member

#### Scenario: Duplicate feedback

- **WHEN** the user tries to add someone already in the campaign
- **THEN** the UI SHALL show an inline error indicating the user is already a member

#### Scenario: Section hidden from non-co-DMs

- **GIVEN** the viewing user is an editor, player, or visitor
- **WHEN** they view the members page
- **THEN** the "Add existing user" section SHALL NOT be visible

### Requirement: CLI direct member add

The aleph-cli SHALL support adding an existing user directly to a campaign via the `member add` sub-command.

#### Scenario: Successful CLI direct add

- **WHEN** `aleph member add --campaign <id> --user <userId> --role <role>` is run
- **THEN** the CLI SHALL call `POST /api/campaigns/[id]/members/direct` and print a success message with the new member's name and role

#### Scenario: User not found via CLI

- **WHEN** the provided userId does not exist
- **THEN** the CLI SHALL print an error message and exit with a non-zero code
