# Arcs & Chapters Management -- Spec

## ADDED Requirements

### Requirement: Arcs list page

The system SHALL provide a page that lists all arcs for a campaign with their status, chapter count, and creation controls for DMs.

#### Scenario: viewing the arcs list

- **Given** I am a campaign member
- **And** the campaign has arcs "Act I" (active), "Act II" (planned), and "Act III" (planned) sorted by sortOrder
- **When** I navigate to `/campaigns/{id}/arcs/`
- **Then** I see a page heading "Arcs"
- **And** I see all three arcs listed in order with their name and status badge
- **And** each arc row shows a chapter count

#### Scenario: empty arcs list

- **Given** I am a campaign member
- **And** the campaign has no arcs
- **When** I navigate to `/campaigns/{id}/arcs/`
- **Then** I see an empty state with a message and a prompt to create the first arc

#### Scenario: creating a new arc

- **Given** I am a campaign DM on the arcs list page
- **When** I fill in the arc creation form with name "Act IV", description "The final confrontation", and status "planned"
- **And** I submit the form
- **Then** the new arc "Act IV" appears in the list
- **And** I see a success indication

#### Scenario: navigating to arc detail

- **Given** I am on the arcs list page with arc "Act I" listed
- **When** I click on "Act I"
- **Then** I am navigated to `/campaigns/{id}/arcs/act-i`

### Requirement: Arc detail page with inline chapter management

The system SHALL provide an arc detail page that displays arc metadata, lists chapters in sort order, and allows DMs to add, edit, reorder, and delete chapters inline.

#### Scenario: viewing arc detail with chapters

- **Given** I am a campaign member
- **And** arc "Act I" has chapters "Arrival" (sort 0), "The Market" (sort 1), "The Ambush" (sort 2)
- **When** I navigate to `/campaigns/{id}/arcs/act-i`
- **Then** I see the arc name "Act I" as the heading
- **And** I see the arc description and status badge
- **And** I see the three chapters listed in sort order with their names and descriptions

#### Scenario: adding a chapter to an arc

- **Given** I am a campaign DM on the arc detail page for "Act I"
- **When** I click "Add Chapter"
- **And** I fill in name "The Escape" and description "The party flees the city"
- **And** I submit the chapter form
- **Then** the chapter "The Escape" appears at the end of the chapters list

#### Scenario: editing a chapter inline

- **Given** I am a campaign DM on the arc detail page
- **And** chapter "The Market" exists in the list
- **When** I click the edit button on "The Market"
- **Then** an inline edit form appears with the chapter's current name and description
- **When** I change the name to "The Grand Market" and save
- **Then** the chapter name updates to "The Grand Market" in the list

#### Scenario: deleting a chapter

- **Given** I am a campaign DM on the arc detail page
- **And** chapter "The Ambush" exists
- **When** I click the delete button on "The Ambush"
- **Then** I see a confirmation dialog
- **When** I confirm the deletion
- **Then** "The Ambush" is removed from the chapters list

#### Scenario: reordering chapters

- **Given** I am a campaign DM on the arc detail page
- **And** chapters are listed as "Arrival" (0), "The Market" (1), "The Ambush" (2)
- **When** I click the "move down" button on "Arrival"
- **Then** the order changes to "The Market" (0), "Arrival" (1), "The Ambush" (2)

#### Scenario: viewing sessions linked to an arc

- **Given** I am on the arc detail page for "Act I"
- **And** sessions "Session 5" and "Session 6" reference this arc
- **Then** I see a "Sessions" section listing "Session 5" and "Session 6" with links to their detail pages

### Requirement: Session form integration with arcs

The system SHALL provide a link from the session form arc/chapter picker to the arcs management page.

#### Scenario: linking to arc management from session form

- **Given** I am editing a session and see the arc/chapter picker dropdowns
- **Then** I see a "Manage Arcs" link next to the arc dropdown
- **When** I click "Manage Arcs"
- **Then** I am navigated to `/campaigns/{id}/arcs/`

### Requirement: Arcs and chapters permissions

The system SHALL restrict arc and chapter creation, editing, and deletion to DM and editor roles, allowing players only read access.

#### Scenario: player cannot create arcs

- **Given** I am a campaign player (not DM or editor)
- **When** I visit the arcs list page
- **Then** I do not see the arc creation form
- **And** I can only view existing arcs and chapters
