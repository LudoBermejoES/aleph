# quest-detail Specification

## Purpose

A quest detail page that shows a quest's full metadata: status, description, parent quest, linked entity, assigned characters and sub-quests.

## Requirements

### Requirement: Quest detail view

The system SHALL provide a quest detail page that displays full quest metadata including status, description, parent quest, linked entity, assigned characters, and sub-quests.

#### Scenario: viewing a quest with full metadata

- **Given** I am a campaign member
- **And** a quest "Find the Lost Sword" exists with status "active", a description, a parent quest "Main Quest", assigned characters ["Arin", "Bela"], and a linked entity "Lost Sword"
- **When** I navigate to `/campaigns/{id}/quests/{slug}`
- **Then** I see the quest name "Find the Lost Sword" as the page heading
- **And** I see the status badge showing "active" with the active icon and blue styling
- **And** I see the description text rendered below the heading
- **And** I see "Parent quest: Main Quest" as a link to the parent quest detail
- **And** I see "Linked entity: Lost Sword" as a link to the entity detail
- **And** I see assigned characters "Arin" and "Bela" displayed as chips linking to their character detail pages

#### Scenario: viewing a quest with sub-quests

- **Given** I am a campaign member
- **And** a quest "Main Quest" exists with two sub-quests: "Find the Sword" (active) and "Defeat the Dragon" (completed)
- **When** I navigate to the "Main Quest" detail page
- **Then** I see a "Sub-quests" section listing both sub-quests
- **And** each sub-quest shows its name, status badge, and links to its own detail page

#### Scenario: viewing a secret quest as a DM

- **Given** I am the campaign DM
- **And** a quest "Secret Conspiracy" exists with `isSecret: true`
- **When** I navigate to the quest detail page
- **Then** I see a "Secret" badge displayed near the quest name

#### Scenario: viewing a quest with no optional fields

- **Given** I am a campaign member
- **And** a quest "Simple Task" exists with only a name and status (no description, no parent, no linked entity, no assigned characters)
- **When** I navigate to the quest detail page
- **Then** I see the quest name and status badge
- **And** the description section is not shown
- **And** the parent quest, linked entity, and assigned characters sections are not shown

#### Scenario: navigating from quest list to quest detail

- **Given** I am on the quests list page
- **And** quests "Quest A" and "Quest B" are listed
- **When** I click on "Quest A"
- **Then** I am navigated to `/campaigns/{id}/quests/{quest-a-slug}`
- **And** I see the quest detail page for "Quest A"

#### Scenario: navigating from quest detail to edit

- **Given** I am a campaign DM on the quest detail page for "Find the Sword"
- **When** I click the "Edit" button
- **Then** I am navigated to `/campaigns/{id}/quests/{slug}/edit`

#### Scenario: quest not found

- **Given** I navigate to `/campaigns/{id}/quests/nonexistent-slug`
- **When** the API returns 404
- **Then** I see an error message indicating the quest was not found

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
