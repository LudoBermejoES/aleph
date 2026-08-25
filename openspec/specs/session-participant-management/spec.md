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

### Requirement: Record XP for a session participant

The system SHALL provide `PATCH /api/campaigns/:id/sessions/:slug/attendance/:userId` allowing
DM or co_dm role holders to set or clear the XP recorded for a participant's attendance row. The
request body SHALL be `{ xp: number | null }` where `xp`, when non-null, MUST be a non-negative
integer. A non-null `xp` SHALL be rejected with HTTP 422 unless the target's attendance row
already has `attended: true`. `xp: null` SHALL always be accepted (clears any previously
recorded value) regardless of the row's `attended` state. The endpoint SHALL 404 if the session
does not exist or if no attendance row exists for `(sessionId, userId)`.

#### Scenario: DM records XP for an attendee

- **GIVEN** a session where `userId` has an attendance row with `attended: true`
- **WHEN** a DM calls `PATCH /api/campaigns/:id/sessions/:slug/attendance/:userId` with
  `{ "xp": 2 }`
- **THEN** the server returns `200`
- **AND** the attendance row's `xp` is `2`

#### Scenario: co_dm can also record XP

- **GIVEN** a session where `userId` has an attendance row with `attended: true`
- **WHEN** a co_dm calls the endpoint with `{ "xp": 1 }`
- **THEN** the server returns `200` and the row's `xp` is `1`

#### Scenario: XP for a participant who did not attend is rejected

- **GIVEN** a session where `userId`'s attendance row has `attended: false` (or no `attended`
  value recorded)
- **WHEN** a DM calls the endpoint with `{ "xp": 2 }`
- **THEN** the server returns `422`
- **AND** the row's `xp` is unchanged

#### Scenario: Clearing XP is always allowed

- **GIVEN** a session where `userId`'s attendance row has `attended: false` and a previously
  recorded `xp`
- **WHEN** a DM calls the endpoint with `{ "xp": null }`
- **THEN** the server returns `200`
- **AND** the row's `xp` becomes `null`

#### Scenario: Negative XP is rejected

- **WHEN** the endpoint is called with `{ "xp": -1 }`
- **THEN** the server returns `422`

#### Scenario: Fractional XP is rejected

- **WHEN** the endpoint is called with `{ "xp": 1.5 }`
- **THEN** the server returns `422`

#### Scenario: Missing `xp` key is rejected

- **WHEN** the endpoint is called with a body that omits `xp` entirely
- **THEN** the server returns `422`

#### Scenario: Player cannot record XP

- **WHEN** a user with the `player` role calls the endpoint
- **THEN** the server returns `403`, regardless of the target row's state

#### Scenario: Recording XP for a nonexistent participant returns 404

- **WHEN** a DM calls the endpoint with a `userId` that has no attendance row on this session
- **THEN** the server returns `404`

#### Scenario: Unknown session returns 404

- **WHEN** the endpoint is called with a slug that does not match a session in the campaign
- **THEN** the server returns `404`

#### Scenario: Unauthenticated request is rejected

- **WHEN** the endpoint is called without a valid session or API key
- **THEN** the server returns `401`

#### Scenario: Setting XP twice is idempotent

- **WHEN** the same `{ "xp": 3 }` body is submitted twice in a row for an attended participant
- **THEN** both calls return `200`
- **AND** the row's `xp` is `3` after the second call

---

### Requirement: XP visible wherever attendance already is

`GET /api/campaigns/:id/sessions/:slug` SHALL include each attendance row's `xp` value
(`null` when not recorded) in the same unfiltered attendance projection it already returns for
`attended` and `rsvpStatus` — no additional per-role or per-user filtering is applied to this
field.

#### Scenario: xp is null before it is ever recorded

- **GIVEN** a session whose attendance rows have never had XP set
- **WHEN** any campaign member who can view the session calls `GET .../sessions/:slug`
- **THEN** every attendance entry's `xp` is `null`, not `0`

#### Scenario: A player can see another participant's recorded XP

- **GIVEN** a session where the DM has recorded `xp: 2` for one attendee
- **WHEN** a different player (also able to view the session) calls `GET .../sessions/:slug`
- **THEN** that attendee's entry shows `xp: 2`

---

### Requirement: Panel UI gates the XP control on `attended`

`SessionAttendancePanel.vue` SHALL, when `canManage` is true, render an XP number input for a
row only when that row's `attended` is `true`; otherwise it SHALL render a disabled/placeholder
indicator instead of an editable control. Changing the input SHALL emit a `set-xp` event with
`(userId, xp)`, where `xp` is `null` when the input is cleared.

#### Scenario: XP input hidden for a non-attended row

- **WHEN** the panel renders a row with `canManage = true` and `attended = false`
- **THEN** no editable XP input is shown for that row

#### Scenario: XP input shown for an attended row

- **WHEN** the panel renders a row with `canManage = true` and `attended = true`
- **THEN** an editable XP number input is shown for that row

#### Scenario: Clearing the input emits null

- **WHEN** a DM clears the XP input for an attended row
- **THEN** the panel emits `set-xp` with `xp: null`

---

### Requirement: CLI XP command

`aleph-cli` SHALL provide `session attendance xp <slug> --campaign <id> --user <userId>
(--xp <n> | --clear)` calling the new endpoint. `--xp` and `--clear` SHALL be mutually
exclusive, and one of them SHALL be required.

#### Scenario: CLI records XP

- **WHEN** `aleph session attendance xp <slug> --campaign <id> --user <userId> --xp 2` is run by
  a DM for an attended participant
- **THEN** the CLI calls the PATCH endpoint with `{ "xp": 2 }` and prints a success confirmation

#### Scenario: CLI clears XP

- **WHEN** `aleph session attendance xp <slug> --campaign <id> --user <userId> --clear` is run
- **THEN** the CLI calls the PATCH endpoint with `{ "xp": null }`

#### Scenario: CLI rejects providing neither flag

- **WHEN** the command is run with neither `--xp` nor `--clear`
- **THEN** the CLI exits with a non-zero status and an error message, without calling the server

#### Scenario: CLI rejects providing both flags

- **WHEN** the command is run with both `--xp <n>` and `--clear`
- **THEN** the CLI exits with a non-zero status and an error message, without calling the server

#### Scenario: CLI surfaces the server's 422 when attendance isn't marked

- **WHEN** a DM runs the command for a participant whose `attended` is `false`
- **THEN** the CLI surfaces the server's `422` error
