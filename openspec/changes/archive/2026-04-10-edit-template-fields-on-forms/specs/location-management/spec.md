## ADDED Requirements

### Requirement: Location POST API accepts templateId and fields

The system SHALL accept `templateId` (optional string) and `fields` (optional record) in `POST /api/campaigns/{id}/locations`. The `templateId` SHALL be written to the entity row and the `fields` SHALL be written to the location's frontmatter alongside the existing `subtype` field.

#### Scenario: create location with templateId and fields

- **GIVEN** an authenticated DM sends `POST /api/campaigns/{id}/locations` with `{ name: "Rivendell", templateId: "tmpl-1", fields: { climate: "Temperate" } }`
- **THEN** the response status is 200
- **AND** `GET /api/campaigns/{id}/locations/{slug}` returns `templateId: "tmpl-1"` and `fields: { climate: "Temperate" }`

#### Scenario: create location without templateId succeeds as before

- **GIVEN** an authenticated DM sends `POST /api/campaigns/{id}/locations` with no `templateId` or `fields`
- **THEN** the response status is 200
- **AND** `fields` in the response is an object (may contain `subtype`)

### Requirement: Location PUT API accepts templateId and fields

The system SHALL accept `templateId` (optional string) and `fields` (optional record) in `PUT /api/campaigns/{id}/locations/{slug}`. When provided, `fields` SHALL be written to the location's frontmatter, preserving the `subtype` value.

#### Scenario: update location fields

- **GIVEN** a location exists with `fields: { climate: "Tropical" }`
- **WHEN** `PUT /api/campaigns/{id}/locations/{slug}` is called with `{ fields: { climate: "Arctic" } }`
- **THEN** `GET /api/campaigns/{id}/locations/{slug}` returns `fields` containing `climate: "Arctic"`

#### Scenario: update location fields preserves subtype

- **GIVEN** a location has `subtype: "city"` stored in its frontmatter fields
- **WHEN** `PUT /api/campaigns/{id}/locations/{slug}` is called with `{ fields: { population: 5000 } }`
- **THEN** the response `subtype` is still `"city"`
