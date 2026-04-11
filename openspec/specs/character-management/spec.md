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

### Requirement: Character detail page has a delete action

The character detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/characters/:slug` on confirmation, then redirects to the character list.

#### Scenario: DM can delete a character from the detail page

- **WHEN** a DM views a character detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the character is deleted
- **AND** the user is redirected to `/campaigns/:id/characters`
