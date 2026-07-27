# dm-session-attendance Specification

## Purpose

Lets a DM or co-DM record who actually attended a session in one call, by sending a list of character slugs to a bulk attendance endpoint that resolves each slug to its character and owning user, upserts the attendance row, and reports back any slug it could not resolve.

## Requirements

### Requirement: DM can bulk-mark session attendance by character slug

The server SHALL expose `PUT /api/campaigns/:id/sessions/:slug/attendance/bulk` allowing a DM or co-DM to record which characters (and their associated users) actually attended a session.

The request body SHALL be:

```json
{
  "attendees": ["character-slug-a", "character-slug-b"],
  "attended": true
}
```

`attended` defaults to `true` when omitted. Setting `attended: false` marks the listed characters as absent.

For each character slug the server SHALL:

1. Resolve the slug to a `characterId` within the campaign.
2. Look up the `userId` of the character's owner via `campaign_members`.
3. Upsert the `session_attendance` row (`sessionId`, `userId`) setting `attended` and `characterId`.
4. Skip silently any slug that cannot be resolved, and return it in `unresolved`.

#### Scenario: DM marks attendees by character slug

- **GIVEN** a campaign where the authenticated user has role `dm`
- **WHEN** `PUT /api/campaigns/:id/sessions/:slug/attendance/bulk` is called with `{ "attendees": ["sim-sim", "laughlin"] }`
- **THEN** the server returns `200` with `{ "updated": 2, "unresolved": [] }`
- **AND** both characters have `attended: true` in `session_attendance`

#### Scenario: co_DM can also use the endpoint

- **GIVEN** a campaign where the authenticated user has role `co_dm`
- **WHEN** the bulk attendance endpoint is called with a valid payload
- **THEN** the server returns `200` and updates the records

#### Scenario: Player cannot use the bulk endpoint

- **GIVEN** a campaign where the authenticated user has role `player`
- **WHEN** `PUT /api/campaigns/:id/sessions/:slug/attendance/bulk` is called
- **THEN** the server returns `403`

#### Scenario: Unauthenticated request is rejected

- **WHEN** the endpoint is called without a valid session or API key
- **THEN** the server returns `401`

#### Scenario: Unknown character slug is skipped and reported

- **GIVEN** the payload includes `"ghost-character"` which does not exist in the campaign
- **WHEN** the bulk endpoint is called
- **THEN** the server returns `200` with `{ "updated": <n>, "unresolved": ["ghost-character"] }`
- **AND** no error is thrown

#### Scenario: Calling endpoint twice is idempotent

- **WHEN** the same character slugs are submitted in two consecutive PUT requests
- **THEN** both calls return `200`
- **AND** the final `attended` value reflects the last call

#### Scenario: `attended: false` marks characters as absent

- **GIVEN** a character who previously had `attended: true`
- **WHEN** `PUT` is called with `{ "attendees": ["that-slug"], "attended": false }`
- **THEN** the character's attendance record is updated to `attended: false`
