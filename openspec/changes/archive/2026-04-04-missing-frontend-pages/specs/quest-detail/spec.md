# Quest Detail Page -- Spec

## ADDED Requirements

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
