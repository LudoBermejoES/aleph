## ADDED Requirements

### Requirement: Character GET API exposes top-level fields property

The system SHALL include a top-level `fields` property in the character GET API response, containing the entity's frontmatter fields object, consistent with how the entity GET endpoint exposes it.

#### Scenario: character with frontmatter fields returns them at top level

- **Given** a character entity with frontmatter containing `fields: { background: "Merchant", alignment: "Neutral" }`
- **When** an authenticated user sends `GET /api/campaigns/{id}/characters/{slug}`
- **Then** the response body includes `"fields": { "background": "Merchant", "alignment": "Neutral" }` at the top level (not only nested under `frontmatter`)

#### Scenario: character without frontmatter fields returns empty object

- **Given** a character entity with no `fields` key in its frontmatter
- **When** an authenticated user sends `GET /api/campaigns/{id}/characters/{slug}`
- **Then** the response body includes `"fields": {}` at the top level

#### Scenario: unauthenticated request is rejected

- **Given** no session cookie or API key is sent
- **When** a request is made to `GET /api/campaigns/{id}/characters/{slug}`
- **Then** the response status is 401 or 403
