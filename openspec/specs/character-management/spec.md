## MODIFIED Requirements

### Requirement: Character status badges display icons

Character status badges in `app/pages/campaigns/[id]/characters/index.vue` and character detail pages SHALL render a leading icon (`w-3 h-3`) before the status text.

#### Scenario: Alive status has Heart icon

- **WHEN** a character with status `alive` is rendered in the list
- **THEN** the status badge shows a `Heart` icon

#### Scenario: Dead status has Skull icon

- **WHEN** a character with status `dead` is rendered in the list
- **THEN** the status badge shows a `Skull` icon

#### Scenario: Missing status has CircleHelp icon

- **WHEN** a character with status `missing` is rendered in the list
- **THEN** the status badge shows a `CircleHelp` icon

### Requirement: Character type badges display icons

PC/NPC type badges SHALL render a leading icon: `Sword` for PC, `Bot` for NPC.

#### Scenario: PC badge has Sword icon

- **WHEN** a PC character is rendered
- **THEN** the type badge shows a `Sword` icon before "PC"

#### Scenario: NPC badge has Bot icon

- **WHEN** an NPC character is rendered
- **THEN** the type badge shows a `Bot` icon before "NPC"

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
