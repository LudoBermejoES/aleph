# session-participant-management Specification

## Purpose

Define the server API, frontend composable, UI component, and CLI commands that allow DMs and co-DMs to add and remove participants from a campaign session.

## Requirements

### Requirement: Add participant to a session

The system SHALL provide `POST /api/campaigns/:id/sessions/:slug/attendance` allowing DM or co_dm role holders to add a campaign member as a session participant. The request body SHALL be `{ userId: string, characterId?: string, rsvpStatus?: 'pending'|'accepted'|'declined'|'tentative' }`. The operation SHALL be idempotent: if an attendance row already exists for `(sessionId, userId)`, it is updated; otherwise a new row is inserted with `rsvpStatus` defaulting to `pending`.

#### Scenario: DM adds a campaign member as participant

- **WHEN** a DM calls `POST /api/campaigns/:id/sessions/:slug/attendance` with `{ userId: "<member-id>" }`
- **THEN** an attendance row is created for that user with `rsvpStatus: 'pending'` and HTTP 200 is returned

#### Scenario: co_dm can also add participants

- **WHEN** a co_dm calls the add-participant endpoint with a valid member userId
- **THEN** the participant is added successfully

#### Scenario: Adding with an explicit rsvpStatus and character

- **WHEN** a DM calls the endpoint with `{ userId: "<member-id>", characterId: "<char-id>", rsvpStatus: "accepted" }` where the character belongs to the campaign
- **THEN** the attendance row is created with that character and `rsvpStatus: 'accepted'`

#### Scenario: Re-adding an existing participant is idempotent

- **WHEN** a DM adds a participant who already has an attendance row for the session
- **THEN** the existing row is updated (no duplicate is created) and HTTP 200 is returned

#### Scenario: Player cannot add participants

- **WHEN** a user with the `player` role calls the add-participant endpoint
- **THEN** the server returns HTTP 403

#### Scenario: Adding a non-member is rejected

- **WHEN** a DM calls the endpoint with a `userId` that is not a member of the campaign
- **THEN** the server returns HTTP 404 indicating the user is not a campaign member

#### Scenario: Invalid body is rejected

- **WHEN** the endpoint is called with a body missing `userId`
- **THEN** the server returns HTTP 422

#### Scenario: characterId from another campaign is rejected

- **WHEN** a DM calls the endpoint with a `characterId` whose entity belongs to a different campaign
- **THEN** the server returns HTTP 422

#### Scenario: Unknown session returns 404

- **WHEN** the endpoint is called with a slug that does not match a session in the campaign
- **THEN** the server returns HTTP 404

#### Scenario: Unauthenticated request rejected

- **WHEN** the endpoint is called without a valid session or API key
- **THEN** the server returns HTTP 401

---

### Requirement: Remove participant from a session

The system SHALL provide `DELETE /api/campaigns/:id/sessions/:slug/attendance/:userId` allowing DM or co_dm role holders to remove a participant's attendance row from a session.

#### Scenario: DM removes a participant

- **WHEN** a DM calls `DELETE /api/campaigns/:id/sessions/:slug/attendance/:userId` for a user who has an attendance row
- **THEN** the attendance row is deleted and HTTP 200 is returned

#### Scenario: Removing a non-participant returns 404

- **WHEN** a DM calls the remove endpoint for a user with no attendance row on that session
- **THEN** the server returns HTTP 404

#### Scenario: Player cannot remove participants

- **WHEN** a user with the `player` role calls the remove endpoint
- **THEN** the server returns HTTP 403 (regardless of whether an attendance row exists)

#### Scenario: Unauthenticated request rejected

- **WHEN** the remove endpoint is called without authentication
- **THEN** the server returns HTTP 401

---

### Requirement: Participant management UI

`SessionAttendancePanel.vue` SHALL, when the existing `canManage` prop is true (DM/co_dm), render an "Add Participant" control and a per-row "Remove" control. The Add control SHALL present campaign members who are not already in the attendance list; selecting one adds them as a participant. The Remove control SHALL remove that participant. The session detail page SHALL refresh the attendance list after an add or remove.

#### Scenario: Add control hidden for non-managers

- **WHEN** the panel renders with `canManage = false`
- **THEN** no "Add Participant" control and no "Remove" buttons are shown

#### Scenario: Add control visible for DM

- **WHEN** the panel renders with `canManage = true`
- **THEN** an "Add Participant" control is visible

#### Scenario: Member picker excludes existing attendees

- **WHEN** a DM opens the Add Participant picker
- **THEN** campaign members already present in the attendance list are not offered as options

#### Scenario: Adding a participant updates the list

- **WHEN** a DM selects a member from the picker
- **THEN** the panel emits the add event, the participant is added, and the attendance list refreshes to include them

#### Scenario: Removing a participant updates the list

- **WHEN** a DM clicks Remove on an attendee row
- **THEN** the panel emits the remove event, the participant is removed, and the attendance list refreshes without them

---

### Requirement: Frontend composable methods

`app/composables/useSessionApi.ts` SHALL export `addSessionParticipant(slug, body)` (POST to the attendance collection) and `removeSessionParticipant(slug, userId)` (DELETE to the attendance member URL). Both SHALL be re-exported via the `useCampaignApi` facade.

#### Scenario: addSessionParticipant posts to the attendance endpoint

- **WHEN** `addSessionParticipant(slug, { userId })` is called
- **THEN** it issues `POST /api/campaigns/:id/sessions/:slug/attendance` with that body

#### Scenario: removeSessionParticipant deletes the member URL

- **WHEN** `removeSessionParticipant(slug, userId)` is called
- **THEN** it issues `DELETE /api/campaigns/:id/sessions/:slug/attendance/:userId`

#### Scenario: Methods available via facade

- **WHEN** a component calls `useCampaignApi(campaignId).addSessionParticipant` / `.removeSessionParticipant`
- **THEN** both are defined and behave identically to the `useSessionApi` versions

---

### Requirement: CLI participant management

`aleph-cli` SHALL provide `session attendance add <slug> --campaign <id> --user <userId> [--character <slug>] [--status <status>]` and `session attendance remove <slug> --campaign <id> --user <userId>` commands calling the new endpoints.

#### Scenario: CLI add participant

- **WHEN** `aleph session attendance add <slug> --campaign <id> --user <userId>` is run by a DM
- **THEN** the participant is added and the CLI prints a success confirmation

#### Scenario: CLI remove participant

- **WHEN** `aleph session attendance remove <slug> --campaign <id> --user <userId>` is run by a DM
- **THEN** the participant is removed and the CLI prints a success confirmation

#### Scenario: CLI add as non-DM is rejected

- **WHEN** a player API key runs `session attendance add`
- **THEN** the CLI surfaces the server's 403 error
