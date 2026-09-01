## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Record XP for a session participant

**Reason**: XP is a property of a character, not of the person playing it. The per-user route
could not express two characters for one player in a session, nor follow a character that changes
hands — both of which occur in live data. Replaced by the per-character requirements above.

**Migration**: none required. `session_attendance.xp` was `NULL` in every row of all 98 sessions in
the live campaign, so the column is dropped without data loss. Callers of
`PATCH /api/campaigns/:id/sessions/:slug/attendance/:userId` move to
`PUT /api/campaigns/:id/sessions/:slug/xp`; CLI users of `aleph session attendance xp` move to
`aleph session xp`.
