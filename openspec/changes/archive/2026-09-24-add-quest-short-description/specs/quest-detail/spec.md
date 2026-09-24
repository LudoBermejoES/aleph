## MODIFIED Requirements

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

## ADDED Requirements

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
