# arcs-chapters-ui Specification

## Purpose

The web UI for managing narrative arcs and their chapters: an arcs list page, an arc detail page that adds, edits, reorders and deletes chapters inline, a link into it from the session form's arc/chapter picker, and the role gating that limits arc and chapter editing to DM and editor roles while players get read access.

## Requirements

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

### Requirement: The arcs list filters by sub-campaign

The arcs list page SHALL render a sub-campaign filter above the list whenever the campaign has more
than one sub-campaign, using the same control the sessions list already uses
(`app/pages/campaigns/[id]/sessions/index.vue`): a row of chips, one per sub-campaign plus a leading
"all" chip that clears the filter, each showing the sub-campaign's `imageUrl` when it has one. The
selected chip SHALL drive the `subCampaignSlug` query parameter the arcs endpoint already accepts, so
the filtering happens in SQL and not in the browser.

The page currently renders no filter of any kind, so this is the first one it gains.

#### Scenario: Filtering the arcs list

- **GIVEN** a campaign with sub-campaigns `General` (3 arcs) and `Mortales` (2 arcs)
- **WHEN** a member opens the arcs page and clicks the `Mortales` chip
- **THEN** only those 2 arcs are listed
- **AND** the request carried `subCampaignSlug=mortales` rather than filtering client-side

#### Scenario: Clearing the filter

- **WHEN** the member then clicks the "all" chip
- **THEN** all 5 arcs are listed again

#### Scenario: A single-sub-campaign campaign shows no filter

- **GIVEN** a campaign with only its default sub-campaign
- **WHEN** a member opens the arcs page
- **THEN** no filter row is rendered, so the concept stays invisible to campaigns that do not use it

### Requirement: The arc form assigns a sub-campaign

Creating or editing an arc SHALL offer a sub-campaign picker, pre-selected to the campaign's default
on create, mirroring `SessionForm.vue`. Submitting it SHALL send `subCampaignSlug`, which the arcs
endpoints already accept. Today the create call sends only `{ name }`, so an arc made from the web
always lands in the default and cannot be moved without the CLI.

#### Scenario: Creating an arc in a chosen sub-campaign

- **WHEN** a co_dm creates an arc with the picker set to `Mortales`
- **THEN** the created arc belongs to `Mortales`

#### Scenario: The picker defaults to the campaign default

- **WHEN** a co_dm opens the arc create form
- **THEN** the picker shows the campaign's default sub-campaign pre-selected

#### Scenario: Moving an existing arc from the web

- **GIVEN** an arc in `General` with 4 sessions
- **WHEN** a co_dm edits it and sets the picker to `Mortales`
- **THEN** the arc and its 4 sessions are in `Mortales`
- **AND** the page reports that 4 sessions moved with it

### Requirement: Arc and chapter views show the sub-campaign they belong to

The arcs list SHALL show each arc's sub-campaign as a badge, in the same manner as the sessions list.
The arc detail page SHALL show the arc's sub-campaign, and the chapters it manages inline SHALL show
the one they inherit, presented read-only with the arc named as the way to change it.

#### Scenario: The arcs list shows each row's sub-campaign

- **WHEN** a member views the unfiltered arcs list
- **THEN** each arc carries a badge naming its sub-campaign

#### Scenario: Chapters show an inherited, non-editable sub-campaign

- **WHEN** a co_dm opens an arc detail page in `Mortales`
- **THEN** each chapter shows `Mortales`
- **AND** the chapter editing controls offer no way to change it, naming the arc instead
