## ADDED Requirements

### Requirement: Quest creation produces a campaign-wide unique slug

The system SHALL assign each newly created quest a slug that is unique across all entities in the campaign (not merely unique among quests), using the same collision-detection already applied to character creation, since quests now also occupy a row in the shared `entities` table.

#### Scenario: Creating a quest with a name that does not collide

- **GIVEN** an editor and no existing entity or quest named "Encontrar al herrero" in campaign `camp-1`
- **WHEN** `POST /api/campaigns/camp-1/quests` is called with `name: "Encontrar al herrero"`
- **THEN** the created quest's slug is `encontrar-al-herrero`

#### Scenario: Creating a quest whose name collides with an existing entity

- **GIVEN** an editor
- **AND** a location entity with slug `la-taberna-dorada` already exists in campaign `camp-1`
- **WHEN** `POST /api/campaigns/camp-1/quests` is called with `name: "La Taberna Dorada"`
- **THEN** the created quest is assigned a de-duplicated slug distinct from `la-taberna-dorada`
- **AND** quest creation succeeds rather than failing on a unique-constraint violation

### Requirement: Quest creation registers a mirror entity for relation support

The system SHALL insert a corresponding row into the `entities` table (`type: "quest"`) whenever a quest is created, mirroring the pattern already used for characters and organizations, without altering the existing "linked entity" field's meaning or the parent-quest/sub-quest display.

#### Scenario: Creating a quest also creates its mirror entity

- **GIVEN** an editor
- **WHEN** `POST /api/campaigns/camp-1/quests` is called with `name: "Encontrar al herrero"`
- **THEN** a row is inserted into `entities` with `type: "quest"` and the same `name`
- **AND** the quest row stores a reference to that entity's id
- **AND** the quest's existing `entityId` field (the optional "linked entity" pointer) is unaffected and continues to only ever be set when the caller explicitly supplies one

#### Scenario: Existing "linked entity" and "parent quest" display are unchanged

- **GIVEN** a quest "Find the Lost Sword" with a parent quest "Main Quest" and a linked entity "Lost Sword"
- **WHEN** a campaign member views the quest detail page
- **THEN** "Parent quest: Main Quest" and "Linked entity: Lost Sword" are still displayed exactly as before this change
