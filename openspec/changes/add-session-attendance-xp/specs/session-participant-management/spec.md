## ADDED Requirements

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
