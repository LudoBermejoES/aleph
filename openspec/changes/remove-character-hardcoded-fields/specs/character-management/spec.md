## MODIFIED Requirements

### Requirement: Character list API

The system SHALL expose `GET /api/campaigns/:id/characters` accepting `type`, `status`, `search`, `folderId`, `companionOf`, `organizationId`, `locationEntityId`, `sort`, and `sortDir` query parameters, all applied server-side. The response SHALL include `locationName` and `primaryOrg` (name + role of first org membership) alongside existing fields. The `race`, `class`, and `alignment` query params and response fields are removed.

#### Scenario: Existing type filter still works

- **WHEN** `GET /api/campaigns/:id/characters?type=pc` is called
- **THEN** only PC characters are returned

#### Scenario: Response includes locationName

- **GIVEN** a character with a locationEntityId pointing to entity named "Rivendell"
- **WHEN** `GET /api/campaigns/:id/characters` is called
- **THEN** the character object includes `locationName: "Rivendell"`

#### Scenario: Response includes primaryOrg

- **GIVEN** a character who is a member of "The Fellowship" with role "Scout"
- **WHEN** `GET /api/campaigns/:id/characters` is called
- **THEN** the character object includes `primaryOrg: { name: "The Fellowship", role: "Scout" }`

#### Scenario: Response does not include race, class, or alignment

- **GIVEN** a character that previously had race/class/alignment set (now migrated to entity_fields)
- **WHEN** `GET /api/campaigns/:id/characters` is called
- **THEN** the character object does NOT contain `race`, `class`, or `alignment` top-level fields

#### Scenario: race/class/alignment query params are ignored

- **WHEN** `GET /api/campaigns/:id/characters?race=Elf` is called
- **THEN** all characters are returned (the param is not processed)
