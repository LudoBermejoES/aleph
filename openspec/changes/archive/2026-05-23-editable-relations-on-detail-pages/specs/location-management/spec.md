## ADDED Requirements

### Requirement: Edit location-link metadata

The system SHALL allow editors+ to update the metadata (description) of an existing character-location or organization-location link without removing and re-adding the link.

#### Scenario: Editor PATCHes inhabitant link metadata

- **GIVEN** character `frodo` is linked to location `the-shire` via an `entity_relations` row with `relationType = 'located_in'`
- **WHEN** an editor sends `PATCH /api/campaigns/:id/locations/the-shire/inhabitants/<frodo-id>` with body `{ description: "Returned in TA 3021" }`
- **THEN** the server responds `200 OK` with the updated link
- **AND** the `entity_relations.description` column reflects the new value
- **AND** the underlying `relationType` and `forwardLabel` / `reverseLabel` are unchanged

#### Scenario: Editor PATCHes organization-at-location metadata

- **GIVEN** organization `grey-havens-traders` is linked to location `the-shire`
- **WHEN** an editor sends `PATCH /api/campaigns/:id/locations/the-shire/organizations/<org-id>` with body `{ description: "Seasonal trading post" }`
- **THEN** the server responds `200 OK`
- **AND** a subsequent `GET /api/campaigns/:id/locations/the-shire/organizations` reflects the new description

#### Scenario: Editor edits inhabitant metadata from the detail page UI

- **GIVEN** an editor on the location detail page for `the-shire`
- **WHEN** they click "Edit" next to an inhabitant, modify the description, and save
- **THEN** the row updates in place without a full page reload

#### Scenario: Player cannot edit location-link metadata

- **GIVEN** a user with the `player` role
- **WHEN** they call either of the new PATCH endpoints
- **THEN** the server responds `403 Forbidden`

#### Scenario: Unauthenticated PATCH is rejected

- **GIVEN** no session cookie and no `X-API-Key` header
- **WHEN** either of the new PATCH endpoints is called
- **THEN** the server responds `401 Unauthorized`
