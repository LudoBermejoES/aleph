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

### Requirement: Award XP to characters for a session

The system SHALL provide `PUT /api/campaigns/:id/sessions/:slug/xp` allowing DM or co_dm role
holders to record how much XP each character earned for that session. The request body SHALL be
`{ awards: [{ characterId: string, xp: number }] }`, where every `xp` MUST be a non-negative
integer and every `characterId` MUST belong to the campaign named by `:id`.

The write SHALL **replace** the session's entire award set: characters present in `awards` are
recorded at the given value, and any character previously recorded for that session but absent
from `awards` SHALL have its award removed. An empty `awards` array SHALL therefore clear every
award for the session.

A character MUST NOT require an attendance row, or `attended: true`, to be awarded XP. The
endpoint SHALL reject with HTTP 422 a body containing a negative or fractional `xp`, a
`characterId` that does not belong to the campaign, or the same `characterId` more than once. The
endpoint SHALL 404 if the session does not exist, and 403 for a caller below `co_dm`.

#### Scenario: DM records XP for several characters at once

- **GIVEN** a session in a campaign where characters `otto` and `julia` exist
- **WHEN** a DM calls `PUT /api/campaigns/:id/sessions/:slug/xp` with
  `{ "awards": [{ "characterId": "<otto>", "xp": 2 }, { "characterId": "<julia>", "xp": 3 }] }`
- **THEN** the server returns `200`
- **AND** the session records `2` XP for `otto` and `3` XP for `julia`

#### Scenario: two characters of the same player are awarded separately

- **GIVEN** a session where one user has an attendance row, and that user plays characters `a` and `b`
- **WHEN** a DM awards `{ "awards": [{ "characterId": "<a>", "xp": 1 }, { "characterId": "<b>", "xp": 2 }] }`
- **THEN** both awards are recorded independently
- **AND** neither overwrites the other

#### Scenario: an award of zero is recorded and is not the same as no award

- **GIVEN** a session with no XP awards recorded
- **WHEN** a DM awards `{ "awards": [{ "characterId": "<otto>", "xp": 0 }] }`
- **THEN** the session reports an award for `otto` with `xp` `0`
- **AND** a session with no award for `otto` reports no entry for `otto` at all

#### Scenario: a PUT that omits a character removes its award

- **GIVEN** a session recording `2` XP for `otto` and `3` XP for `julia`
- **WHEN** a DM calls the endpoint with `{ "awards": [{ "characterId": "<otto>", "xp": 2 }] }`
- **THEN** the server returns `200`
- **AND** `otto` still has `2`
- **AND** `julia` has no award for that session

#### Scenario: a character that did not attend may still be awarded

- **GIVEN** a session where character `otto` has no attendance row at all
- **WHEN** a DM awards `otto` `2` XP for that session
- **THEN** the server returns `200` and the award is recorded

#### Scenario: a character from another campaign is refused

- **GIVEN** a character belonging to a different campaign
- **WHEN** a DM awards it XP on this campaign's session
- **THEN** the server returns `422` and nothing is recorded

#### Scenario: negative and fractional values are refused

- **WHEN** a DM calls the endpoint with an `xp` of `-1` or `1.5`
- **THEN** the server returns `422` and no award is written

#### Scenario: a player may not award XP

- **GIVEN** a caller whose campaign role is below `co_dm`
- **WHEN** they call the endpoint
- **THEN** the server returns `403` and nothing is recorded

### Requirement: Clear one character's XP award

The system SHALL provide `DELETE /api/campaigns/:id/sessions/:slug/xp/:characterId`, gated to DM
or co_dm, removing that character's award for that session. The endpoint SHALL return `204` when
an award was removed and `404` when no award existed for `(session, character)`, so a caller can
tell "cleared" from "there was nothing there".

#### Scenario: DM clears a single award

- **GIVEN** a session recording `2` XP for `otto`
- **WHEN** a DM calls `DELETE .../xp/<otto>`
- **THEN** the server returns `204`
- **AND** the session reports no award for `otto`
- **AND** awards for other characters are untouched

#### Scenario: clearing an award that was never recorded

- **GIVEN** a session with no award for `otto`
- **WHEN** a DM calls `DELETE .../xp/<otto>`
- **THEN** the server returns `404`

### Requirement: Session detail reports its XP awards

`GET /api/campaigns/:id/sessions/:slug` SHALL include an `xpAwards` array alongside `attendance`,
each entry `{ characterId, characterName, characterSlug, xp }`, visible to any caller who may
already view the session's attendance. The array SHALL be empty when nothing is recorded.

#### Scenario: awards are returned with the session

- **GIVEN** a session recording `2` XP for `otto`
- **WHEN** a member fetches the session detail
- **THEN** `xpAwards` contains one entry for `otto` with `xp` `2` and its display name

### Requirement: Award XP to characters from the CLI

The CLI SHALL provide `aleph session xp <slug> --campaign <id>` with:

- `--character <slug> --xp <n>` — record one character's award, **preserving** every other award
  already recorded for that session (read-modify-write, so a single-character call is never a
  whole-list replacement).
- `--character <slug> --clear` — remove one character's award.
- `--list` — print the session's current awards.

The CLI SHALL refuse a call that gives neither `--xp` nor `--clear` alongside `--character`, rather
than silently doing nothing.

#### Scenario: awarding one character leaves the others alone

- **GIVEN** a session recording `2` XP for `julia`
- **WHEN** the user runs `aleph session xp <slug> --campaign <id> --character otto --xp 3`
- **THEN** the session records `3` for `otto` **and still** `2` for `julia`

#### Scenario: listing a session's awards

- **GIVEN** a session recording awards for two characters
- **WHEN** the user runs `aleph session xp <slug> --campaign <id> --list`
- **THEN** both characters and their values are printed

#### Scenario: a call with no action is refused

- **WHEN** the user runs `aleph session xp <slug> --campaign <id> --character otto`
- **THEN** the CLI exits non-zero with a message naming `--xp` or `--clear`
- **AND** no request is sent

### Requirement: Choose which characters receive XP in the UI

The session detail page SHALL present an XP panel, visible to DM and co_dm, listing every
character that appears in that session's attendance roster, each with a non-negative integer
input. The panel SHALL also offer a picker to add any other character of the campaign to the list,
so a character absent from the roster can still be awarded. Saving SHALL send the whole list in one
`PUT`, and removing a row from the panel SHALL remove that character's award on save.

#### Scenario: the roster's characters are offered by default

- **GIVEN** a session whose attendance rows name three characters
- **WHEN** a DM opens the session page
- **THEN** the XP panel lists those three characters

#### Scenario: a character outside the roster can be added

- **GIVEN** a campaign character with no attendance row for this session
- **WHEN** the DM adds it through the panel's picker and saves an award
- **THEN** the award is recorded for that character

#### Scenario: players do not see the editing affordance

- **GIVEN** a caller whose role is below `co_dm`
- **WHEN** they open the session page
- **THEN** no XP input or picker is rendered
