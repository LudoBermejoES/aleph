## MODIFIED Requirements

### Requirement: Character list API
The system SHALL expose `GET /api/campaigns/:id/characters` accepting `type`, `status`, `search`, `folderId`, `companionOf`, `race`, `class`, `alignment`, `organizationId`, `locationEntityId`, `sort`, and `sortDir` query parameters, all applied server-side. The response SHALL include `locationName` and `primaryOrg` (name + role of first org membership) alongside existing fields.

#### Scenario: Existing type filter still works
- **WHEN** `GET /api/campaigns/:id/characters?type=pc` is called
- **THEN** only PC characters are returned

#### Scenario: New race param filters server-side
- **WHEN** `GET /api/campaigns/:id/characters?race=Elf` is called
- **THEN** only characters with race "Elf" are returned and no client-side filtering is needed

#### Scenario: Response includes locationName
- **GIVEN** a character with a locationEntityId pointing to entity named "Rivendell"
- **WHEN** `GET /api/campaigns/:id/characters` is called
- **THEN** the character object includes `locationName: "Rivendell"`

#### Scenario: Response includes primaryOrg
- **GIVEN** a character who is a member of "The Fellowship" with role "Scout"
- **WHEN** `GET /api/campaigns/:id/characters` is called
- **THEN** the character object includes `primaryOrg: { name: "The Fellowship", role: "Scout" }`
