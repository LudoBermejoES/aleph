# campaign-export Specification

## Purpose

Lets a DM take a complete copy of a campaign out of Aleph as a single JSON file, optionally narrowed to selected resource types via query parameter, restricted to DMs and co-DMs, and triggered from either a button on the campaign dashboard or the CLI.

## Requirements

### Requirement: Full Campaign JSON Export

The system SHALL export all campaign data as a single JSON file via an API endpoint.

#### Scenario: Exporting a full campaign as JSON

- GIVEN a user with the `dm` role on a campaign that has entities, characters, sessions, and other resources
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response has `Content-Type: application/json`
- AND the response has a `Content-Disposition` header with a filename containing the campaign slug and date
- AND the JSON body contains a `version` field set to `"1.1"`
- AND the JSON body contains an `exportedAt` ISO timestamp
- AND the JSON body contains a `campaign` object with the campaign metadata
- AND the JSON body contains arrays for all resource types (`entities`, `characters`, `sessions`, `locations`, `organizations`, etc.)
- AND the JSON body contains a top-level `images` object (may be empty)

#### Scenario: Export includes all resource types

- GIVEN a campaign with at least one record in entities, characters, sessions, locations, organizations, quests, maps, calendars, timelines, relations, items, inventories, currencies, shops, arcs, chapters, and rolls
- WHEN the DM exports the campaign
- THEN each resource type array in the export contains the correct number of records
- AND each record includes all its database fields (excluding internal-only fields like content hashes)

#### Scenario: Export of empty campaign

- GIVEN a campaign with no entities, characters, sessions, or other child resources
- WHEN the DM exports the campaign
- THEN the response is valid JSON with empty arrays for all resource types
- AND the `campaign` object contains the campaign metadata

---

### Requirement: Selective Export

The system SHALL support exporting only selected resource types via query parameter.

#### Scenario: Exporting only entities and characters

- GIVEN a campaign with entities, characters, sessions, and locations
- WHEN the user sends `GET /api/campaigns/:id/export?include=entities,characters`
- THEN the JSON body contains the `campaign` object (always included)
- AND the JSON body contains `entities` and `characters` arrays with data
- AND the JSON body does NOT contain `sessions`, `locations`, or other resource type keys

#### Scenario: Including an invalid resource type

- GIVEN a valid campaign
- WHEN the user sends `GET /api/campaigns/:id/export?include=entities,foobar`
- THEN the response includes the `entities` array
- AND the invalid key `foobar` is silently ignored (no error, no key in output)

#### Scenario: Omitting the include parameter exports everything

- GIVEN a campaign with data in multiple resource types
- WHEN the user sends `GET /api/campaigns/:id/export` without the `include` parameter
- THEN all resource types are included in the export

---

### Requirement: Export Authorization

The system SHALL restrict export access to DMs and co-DMs of the campaign.

#### Scenario: DM can export

- GIVEN a user with the `dm` role on a campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 200

#### Scenario: Co-DM can export

- GIVEN a user with the `co_dm` role on a campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 200

#### Scenario: Player cannot export

- GIVEN a user with the `player` role on a campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 403

#### Scenario: Unauthenticated user cannot export

- GIVEN no authentication credentials
- WHEN a request is sent to `GET /api/campaigns/:id/export`
- THEN the response status is 401

#### Scenario: Non-member cannot export

- GIVEN a user who is not a member of the campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 403

#### Scenario: Export of non-existent campaign

- GIVEN an authenticated user
- WHEN the user sends `GET /api/campaigns/:id/export` with a non-existent campaign ID
- THEN the response status is 404

---

### Requirement: Frontend Export Button

The system SHALL provide a download button on the campaign dashboard for DMs and co-DMs.

#### Scenario: DM sees the export button

- GIVEN a user with the `dm` role viewing the campaign dashboard
- WHEN the page loads
- THEN an "Export Campaign" button is visible

#### Scenario: Player does not see the export button

- GIVEN a user with the `player` role viewing the campaign dashboard
- WHEN the page loads
- THEN no export button is visible

#### Scenario: Clicking the export button downloads a JSON file

- GIVEN a DM on the campaign dashboard
- WHEN the DM clicks the "Export Campaign" button
- THEN a JSON file download is triggered in the browser
- AND the filename contains the campaign slug

---

### Requirement: CLI Export Command

The system SHALL provide a CLI command to export campaign data.

#### Scenario: Exporting via CLI to a file

- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export <id> --output export.json`
- THEN the file `export.json` is created with valid campaign export JSON

#### Scenario: Exporting via CLI to stdout

- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export <id>`
- THEN the export JSON is printed to stdout

#### Scenario: Selective CLI export

- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export <id> --include entities,characters`
- THEN the output JSON contains only the specified resource types plus the campaign envelope

#### Scenario: CLI export with invalid campaign ID

- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export nonexistent-id`
- THEN the CLI prints an error message indicating the campaign was not found
- AND the exit code is non-zero

---

### Requirement: Export and import include location image galleries

The campaign export payload SHALL include a `locationImages` array containing every
`entity_images` row of the campaign, with `id`, `entityId`, `filename`, `url`, `caption`,
`sortOrder`, `isPrimary` and `createdAt`. Import SHALL recreate those rows, remapping `entityId`
through the entity id map it already builds, so that a location's gallery, its order, its captions
and its main image all survive an export/import round-trip.

#### Scenario: Export contains the gallery rows

- **GIVEN** a campaign with a location that has three images
- **WHEN** a DM sends `GET /api/campaigns/:id/export`
- **THEN** the JSON body contains a `locationImages` array with three entries for that location
- **AND** exactly one of them has `isPrimary: true`

#### Scenario: Campaign with no galleries exports an empty array

- **GIVEN** a campaign in which no location has images
- **WHEN** the DM exports the campaign
- **THEN** `locationImages` is present and empty

#### Scenario: Selective export honours the include parameter

- **WHEN** the DM sends `GET /api/campaigns/:id/export?include=entities,characters`
- **THEN** the JSON body does NOT contain a `locationImages` key

#### Scenario: Import restores the gallery and its main image

- **GIVEN** an export whose `locationImages` array describes a three-image gallery
- **WHEN** the export is imported into a new campaign
- **THEN** `GET /api/campaigns/{newId}/locations/{slug}/images` returns the three images in the
  original order with their captions
- **AND** the same image is primary as in the source campaign
- **AND** the new location's `entities.imageUrl` matches that primary image's new URL

#### Scenario: Import of an export without locationImages succeeds

- **GIVEN** an export produced before this change, with no `locationImages` key
- **WHEN** it is imported
- **THEN** the import succeeds and the imported locations simply have empty galleries

### Requirement: Export and import include character and organization image galleries

The campaign export payload SHALL include a `characterImages` array containing every
`entity_images` row belonging to a character entity in the campaign, and an `organizationImages`
array containing every `entity_images` row belonging to an organization entity, each with
`id`, `entityId`, `filename`, `url`, `caption`, `sortOrder`, `isPrimary` and `createdAt`.
Import SHALL recreate those rows, remapping `entityId` through the entity id map it already
builds, so that a character's and an organization's gallery, order, captions and main image
all survive an export/import round-trip.

#### Scenario: Export contains character gallery rows

- **GIVEN** a campaign with a character that has two portrait images
- **WHEN** a DM sends `GET /api/campaigns/:id/export`
- **THEN** the JSON body contains a `characterImages` array with two entries for that character
- **AND** exactly one of them has `isPrimary: true`

#### Scenario: Export contains organization gallery rows

- **GIVEN** a campaign with an organization that has three images
- **WHEN** a DM exports the campaign
- **THEN** the JSON body contains an `organizationImages` array with three entries for that organization

#### Scenario: Campaign with no galleries exports empty arrays

- **GIVEN** a campaign in which no character or organization has gallery images
- **WHEN** the DM exports the campaign
- **THEN** `characterImages` and `organizationImages` are present and empty

#### Scenario: Selective export honours the include parameter

- **WHEN** the DM sends `GET /api/campaigns/:id/export?include=entities,sessions`
- **THEN** the JSON body does NOT contain `characterImages` or `organizationImages` keys

#### Scenario: Import restores character gallery and main portrait

- **GIVEN** an export whose `characterImages` array describes a two-image gallery
- **WHEN** the export is imported into a new campaign
- **THEN** `GET /api/campaigns/{newId}/characters/{slug}/images` returns the two images in the
  original order with their captions
- **AND** the same image is primary as in the source campaign
- **AND** the new character's `characters.portraitUrl` matches that primary image's new URL

#### Scenario: Import restores organization gallery and main image

- **GIVEN** an export whose `organizationImages` array describes a gallery
- **WHEN** the export is imported into a new campaign
- **THEN** the organization's gallery is restored with the correct primary
- **AND** `organizations.imageUrl` matches that primary image's new URL

#### Scenario: Import of an export without character/org image arrays succeeds

- **GIVEN** an export produced before this change, with no `characterImages` or `organizationImages` key
- **WHEN** it is imported
- **THEN** the import succeeds and the imported characters and organizations simply have empty galleries
