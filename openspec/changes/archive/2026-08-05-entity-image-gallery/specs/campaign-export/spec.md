## ADDED Requirements

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
