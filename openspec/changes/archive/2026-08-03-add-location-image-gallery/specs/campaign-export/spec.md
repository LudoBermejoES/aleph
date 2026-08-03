## ADDED Requirements

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
