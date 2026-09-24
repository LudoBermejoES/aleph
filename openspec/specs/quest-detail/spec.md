# quest-detail Specification

## Purpose

A quest detail page that shows a quest's full metadata: status, description, parent quest, linked entity, assigned characters and sub-quests.

## Requirements

### Requirement: Quest detail view

The system SHALL provide a quest detail page that displays full quest metadata including status, short description, description, parent quest, linked entity, assigned characters, and sub-quests. When a short description is present it SHALL be shown as a standfirst above the full description, visually distinct from it.

#### Scenario: viewing a quest with full metadata

- **Given** I am a campaign member
- **And** a quest "Find the Lost Sword" exists with status "active", a short description, a description, a parent quest "Main Quest", assigned characters ["Arin", "Bela"], and a linked entity "Lost Sword"
- **When** I navigate to `/campaigns/{id}/quests/{slug}`
- **Then** I see the quest name "Find the Lost Sword" as the page heading
- **And** I see the status badge showing "active" with the active icon and blue styling
- **And** I see the short description as a standfirst directly below the heading
- **And** I see the description text rendered below the standfirst
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
- **And** a quest "Simple Task" exists with only a name and status (no short description, no description, no parent, no linked entity, no assigned characters)
- **When** I navigate to the quest detail page
- **Then** I see the quest name and status badge
- **And** neither the standfirst nor the description section is shown
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

#### Scenario: viewing a quest that has a short description but no long description

- **Given** I am a campaign member
- **And** a quest "El contador Geiger" exists with a short description and no description
- **When** I navigate to the quest detail page
- **Then** I see the short description as a standfirst
- **And** no empty description section is rendered below it

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

### Requirement: The quests list filters by sub-campaign alongside status

The quests list page SHALL render a sub-campaign filter whenever the campaign has more than one
sub-campaign, using the chip control the sessions list uses, and it SHALL compose with the existing
status filter rather than replacing it: both predicates apply together, as the quests endpoint
already supports. The selected chip SHALL drive the `subCampaignSlug` query parameter.

#### Scenario: Both filters apply together

- **GIVEN** a campaign with 9 quests, of which 4 are in `Mortales` and 2 of those 4 are `completed`
- **WHEN** a member selects the `Mortales` chip and the `completed` status
- **THEN** exactly those 2 quests are listed

#### Scenario: Changing one filter preserves the other

- **WHEN** the member then switches the status filter to `active`
- **THEN** the `Mortales` chip stays selected and the list shows that sub-campaign's active quests

#### Scenario: A single-sub-campaign campaign shows only the status filter

- **GIVEN** a campaign with only its default sub-campaign
- **WHEN** a member opens the quests page
- **THEN** the status filter renders and no sub-campaign filter does

### Requirement: The quest form assigns a sub-campaign

Creating or editing a quest SHALL offer a sub-campaign picker, pre-selected to the campaign's default
on create, and submit it as `subCampaignSlug`. The quest detail page SHALL show the quest's
sub-campaign.

#### Scenario: Creating a quest in a chosen sub-campaign

- **WHEN** a co_dm creates a quest with the picker set to `Mortales`
- **THEN** the created quest belongs to `Mortales`

#### Scenario: Moving an existing quest from the web

- **WHEN** a co_dm edits a quest in `General` and sets the picker to `Mortales`
- **THEN** the quest belongs to `Mortales`

#### Scenario: The quest detail page names its sub-campaign

- **WHEN** a member opens a quest detail page
- **THEN** the sub-campaign is shown by name, not as a raw id

### Requirement: The quests list shows the short description in full

The quests list SHALL show a quest's short description complete and untruncated, with no ellipsis and no line clamp. When a quest has no short description the list SHALL fall back to a flattened excerpt of its long description, clamped; when it has neither, the list SHALL show no description text at all.

#### Scenario: a quest with a short description shows it whole

- **Given** a quest whose short description is 200 characters long
- **When** I view the quests list
- **Then** I see all 200 characters
- **And** the text carries no ellipsis
- **And** no line clamp is applied to it

#### Scenario: a quest without a short description falls back to an excerpt

- **Given** a quest with no short description and a 2,300-character markdown description
- **When** I view the quests list
- **Then** I see a flattened excerpt of the long description
- **And** the excerpt contains no markdown syntax
- **And** the excerpt is clamped so it cannot grow the card

#### Scenario: a quest with neither shows no description text

- **Given** a quest with no short description and no description
- **When** I view the quests list
- **Then** the card shows the quest name and status badge only
- **And** no empty paragraph is rendered

#### Scenario: the short description takes precedence over the long one

- **Given** a quest that has both a short description and a long description
- **When** I view the quests list
- **Then** I see the short description
- **And** I do not see an excerpt of the long description

#### Scenario: an unbroken 200-character string does not overflow the card

- **Given** a quest whose short description is 200 characters with no spaces
- **When** I view the quests list
- **Then** the text wraps within the card
- **And** the page has no horizontal scroll
