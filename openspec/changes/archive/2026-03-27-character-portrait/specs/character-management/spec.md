## MODIFIED Requirements

### Requirement: Character detail response includes portraitUrl
The character detail endpoint `GET /api/campaigns/[id]/characters/[slug]` SHALL include a `portraitUrl` field in its response. The value SHALL be the portrait API path when a portrait exists, or `null` otherwise.

#### Scenario: portraitUrl included in character detail
- **WHEN** a member fetches `GET /api/campaigns/<id>/characters/<slug>`
- **THEN** the response JSON includes a `portraitUrl` field (string or null)

### Requirement: Character list response includes portraitUrl
The character list endpoint `GET /api/campaigns/[id]/characters` SHALL include `portraitUrl` for each character in the list.

#### Scenario: portraitUrl included in character list items
- **WHEN** a member fetches the character list
- **THEN** each character object in the response includes a `portraitUrl` field (string or null)
