## MODIFIED Requirements

### Requirement: Character PUT API accepts templateId and fields

The system SHALL accept `templateId` (optional string), `fields` (optional record), `backstory` (optional string or null), `history` (optional string or null), and `currentStatus` (optional string or null) in `PUT /api/campaigns/{id}/characters/{slug}`. When provided, `templateId` SHALL be updated on the entity row and `fields` SHALL be merged into the character's frontmatter. `backstory`, `history`, and `currentStatus` SHALL be persisted to the corresponding `characters` table columns.

#### Scenario: update character fields

- **GIVEN** a character exists with `fields: { background: "Farmer" }`
- **WHEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `{ fields: { background: "Merchant" } }`
- **THEN** `GET /api/campaigns/{id}/characters/{slug}` returns `fields: { background: "Merchant" }`

#### Scenario: update character templateId

- **GIVEN** a character exists with no templateId
- **WHEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `{ templateId: "tmpl-2" }`
- **THEN** `GET /api/campaigns/{id}/characters/{slug}` returns `templateId: "tmpl-2"`

#### Scenario: update backstory

- **GIVEN** a character exists with `backstory: null`
- **WHEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `{ backstory: "Grew up in the Stolen Lands." }`
- **THEN** `GET /api/campaigns/{id}/characters/{slug}` returns `backstory: "Grew up in the Stolen Lands."`

#### Scenario: update currentStatus

- **GIVEN** a character exists with `currentStatus: null`
- **WHEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `{ currentStatus: "Wounded, resting at the inn." }`
- **THEN** `GET /api/campaigns/{id}/characters/{slug}` returns `currentStatus: "Wounded, resting at the inn."`

#### Scenario: omitted narrative fields are unchanged

- **GIVEN** a character exists with `history: "Session 1: arrived."`, `backstory: "Born in the mountains."`
- **WHEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `{ currentStatus: "Healthy." }` (no history or backstory key)
- **THEN** `GET /api/campaigns/{id}/characters/{slug}` returns `history: "Session 1: arrived."` and `backstory: "Born in the mountains."` unchanged
