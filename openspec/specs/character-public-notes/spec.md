# character-public-notes Specification

## Purpose

TBD - created by archiving change add-character-public-notes. Update Purpose after archive.

## Requirements

### Requirement: Public notes storage

The system SHALL store at most one note per `(character, author)` pair, so that no member's note
can be overwritten by another member's save.

#### Scenario: Two members annotate the same character

- GIVEN a character visible to campaign members Ana and Luis
- AND Ana has already saved a note on that character
- WHEN Luis saves a note on the same character
- THEN both notes exist
- AND Ana's note body is unchanged

#### Scenario: The same author saves twice

- GIVEN a member who already has a note on a character
- WHEN they save a new body for that character
- THEN the existing row is updated in place
- AND exactly one note for that `(character, author)` pair exists

#### Scenario: Saving an empty body removes the note

- GIVEN a member with an existing note on a character
- WHEN they save a body that is empty or only whitespace
- THEN the note row is deleted
- AND the character payload no longer lists a note for that member

#### Scenario: Deleting a character removes its notes

- GIVEN a character with notes from two different members
- WHEN the character is deleted
- THEN no `character_notes` rows referencing that character remain

#### Scenario: Deleting a user removes their notes

- GIVEN a member with notes on several characters
- WHEN that user account is deleted
- THEN their notes are removed, because an unattributable note must not be displayed

### Requirement: Who may annotate

The system SHALL allow a campaign member to annotate any character they are already permitted to
read, and SHALL NOT allow the `visitor` role to annotate at all.

#### Scenario: A player annotates a character they do not own

- GIVEN an authenticated user with the `player` role in a campaign
- AND a character owned by a different user, visible to campaign members
- WHEN they send `PUT /api/campaigns/:id/characters/:slug/notes/me` with a body
- THEN the response is `200`
- AND their note is stored

#### Scenario: A player annotates their own character

- GIVEN an authenticated `player` who owns the character
- WHEN they save a note on it
- THEN the response is `200` — owning the character does not remove the notes area

#### Scenario: A visitor is refused

- GIVEN an authenticated user with the `visitor` role
- WHEN they send `PUT .../notes/me`
- THEN the response is `403`
- AND no note is stored

#### Scenario: A character the caller cannot see

- GIVEN a character whose visibility excludes the caller's role
- WHEN they send `PUT .../notes/me` for that character
- THEN the response is `404`, identical to the response for reading it
- AND the response does not reveal that the character exists

#### Scenario: Unauthenticated request

- GIVEN no session cookie and no `X-API-Key` header
- WHEN a `PUT .../notes/me` request is sent
- THEN the response is `401`

#### Scenario: Authenticated by API key

- GIVEN a valid `X-API-Key` for a user with the `player` role
- WHEN they send `PUT .../notes/me` with a body
- THEN the note is stored and attributed to that key's user

### Requirement: Public notes are readable by campaign members

The system SHALL include every note on a character in that character's read payload for any
caller permitted to read the character, each attributed to its author.

#### Scenario: Notes appear on the character payload

- GIVEN a character with notes from two members
- WHEN any member who can read the character sends `GET .../characters/:slug`
- THEN the payload includes both notes
- AND each note carries its author's id and display name and its `updatedAt`

#### Scenario: Notes follow the character's visibility

- GIVEN a character with notes, whose visibility is then narrowed to `dm_only`
- WHEN a `player` requests that character
- THEN they receive `404`
- AND they cannot obtain the notes by any other route

#### Scenario: A caller reads their own note

- GIVEN a member with a note on a character
- WHEN they send `GET .../characters/:slug/notes/me`
- THEN the response contains their note body

#### Scenario: A caller with no note

- GIVEN a member who has never annotated a character
- WHEN they send `GET .../characters/:slug/notes/me`
- THEN the response is `200` with a null note, not `404`

### Requirement: The character update route is unchanged

The system SHALL keep `PUT /api/campaigns/:id/characters/:slug` restricted exactly as before, so
that the notes capability creates no path to owner-only fields.

#### Scenario: A non-owner still cannot edit character data

- GIVEN an authenticated `player` and a character owned by someone else
- WHEN they send `PUT .../characters/:slug` with any field
- THEN the response is `403 You can only edit your own character`

#### Scenario: The notes route rejects character fields

- GIVEN an authenticated `player`
- WHEN they send `PUT .../notes/me` with a payload containing `ownerUserId`, `visibility` or
  `fields` alongside `body`
- THEN only `body` is applied
- AND the character row is not modified in any way

### Requirement: Restricted edit mode for non-owners

The character page SHALL offer **Edit character** to a member who may annotate but not edit, and
that editor SHALL expose the note field only.

#### Scenario: A non-owner opens the editor

- GIVEN a `player` viewing a character they do not own
- WHEN they click **Edit character**
- THEN an editor opens containing the note field
- AND no owner-only field (name, visibility, owner, template fields, backstory, history) is
  rendered in the DOM — absent, not disabled
- AND saving submits only the note

#### Scenario: The owner opens the editor

- GIVEN a `player` viewing a character they own
- WHEN they click **Edit character**
- THEN the full editor opens, exactly as before this change

#### Scenario: An editor opens the editor

- GIVEN a user with the `editor` role or higher
- WHEN they open a character for editing
- THEN the full editor opens for any character, owned or not

#### Scenario: A visitor sees no editor

- GIVEN a `visitor` viewing a character
- THEN no **Edit character** action is offered

#### Scenario: Notes are displayed with attribution

- GIVEN a character with notes from two members
- WHEN any member who can read it views the character page
- THEN each note is shown with its author's name and last-updated time
- AND a member can tell at a glance which note is their own

### Requirement: CLI support for character notes

The aleph-cli SHALL be able to read and write the authenticated user's note on a character.

#### Scenario: Writing a note from the CLI

- GIVEN a configured API key for a user who may annotate
- WHEN the user runs the character-note write command with a body
- THEN the note is stored and the command reports success

#### Scenario: Reading notes from the CLI

- GIVEN a configured API key for a user who can read a character
- WHEN the user runs the character-note read command
- THEN every note on the character is printed with its author

#### Scenario: The CLI surfaces a refusal

- GIVEN a configured API key for a `visitor`
- WHEN they attempt to write a note
- THEN the command exits non-zero and reports the `403`, rather than reporting success
