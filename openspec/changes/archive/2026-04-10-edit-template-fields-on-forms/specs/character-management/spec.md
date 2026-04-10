## ADDED Requirements

### Requirement: Character POST API accepts templateId and fields

The system SHALL accept `templateId` (optional string) and `fields` (optional record) in `POST /api/campaigns/{id}/characters`. The `templateId` SHALL be written to the entity row and the `fields` SHALL be written to the character's frontmatter.

#### Scenario: create character with templateId and fields

- **GIVEN** an authenticated DM sends `POST /api/campaigns/{id}/characters` with `{ name: "Gandalf", characterType: "npc", templateId: "tmpl-1", fields: { background: "Wizard" } }`
- **THEN** the response status is 200
- **AND** the returned character includes `templateId: "tmpl-1"`
- **AND** `GET /api/campaigns/{id}/characters/{slug}` returns `fields: { background: "Wizard" }`

#### Scenario: create character without templateId succeeds as before

- **GIVEN** an authenticated DM sends `POST /api/campaigns/{id}/characters` with no `templateId` or `fields`
- **THEN** the response status is 200
- **AND** the returned character has `fields: {}`

### Requirement: Character PUT API accepts templateId and fields

The system SHALL accept `templateId` (optional string) and `fields` (optional record) in `PUT /api/campaigns/{id}/characters/{slug}`. When provided, `templateId` SHALL be updated on the entity row and `fields` SHALL be merged into the character's frontmatter.

#### Scenario: update character fields

- **GIVEN** a character exists with `fields: { background: "Farmer" }`
- **WHEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `{ fields: { background: "Merchant" } }`
- **THEN** `GET /api/campaigns/{id}/characters/{slug}` returns `fields: { background: "Merchant" }`

#### Scenario: update character templateId

- **GIVEN** a character exists with no templateId
- **WHEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `{ templateId: "tmpl-2" }`
- **THEN** `GET /api/campaigns/{id}/characters/{slug}` returns `templateId: "tmpl-2"`
