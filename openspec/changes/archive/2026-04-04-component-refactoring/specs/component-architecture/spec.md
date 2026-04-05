# Component Architecture — spec

## MODIFIED Requirements

### Requirement: MarkdownEditor toolbar and formatting

The MarkdownEditor component SHALL render a complete toolbar with formatting buttons and SHALL toggle active state styling to reflect the current text selection.

#### Scenario: Toolbar renders all formatting buttons

- **Given** the MarkdownEditor is mounted with a campaign context
- **When** the editor initializes
- **Then** all toolbar buttons render (bold, italic, strikethrough, code, H1-H3, bullet list, ordered list, task list, blockquote, code block, HR, link, table, image, undo, redo)
- **And** active state styling reflects the current selection (e.g., bold button highlighted when cursor is in bold text)

#### Scenario: Toolbar buttons execute formatting commands

- **Given** the editor has focus and text is selected
- **When** the user clicks the bold toolbar button
- **Then** the selected text is toggled bold
- **And** the toolbar button reflects the new active state

### Requirement: MarkdownEditor entity mention dropdown

The MarkdownEditor SHALL display a searchable entity suggestion dropdown when the user types `@` followed by characters, and MUST support keyboard navigation and entity link insertion.

#### Scenario: Entity mention dropdown uses Vue component

- **Given** the editor is mounted with a campaignId
- **When** the user types `@` followed by at least 1 character
- **Then** an entity suggestion dropdown appears (data-testid="entity-suggestions")
- **And** it displays matching entities from the campaign API with name and type
- **And** keyboard navigation (ArrowUp, ArrowDown, Enter, Escape) works

#### Scenario: Entity mention dropdown shows empty state

- **Given** the editor is mounted with a campaignId
- **When** the user types `@xyz` and no entities match
- **Then** the dropdown shows "No entities found" (data-testid="entity-suggestions-empty")

#### Scenario: Entity mention inserts entity link

- **Given** the entity mention dropdown is showing results
- **When** the user selects an entity (click or Enter)
- **Then** an entityMention node is inserted with the entity's slug, name, and id
- **And** the dropdown closes

### Requirement: MarkdownEditor collaboration mode

The MarkdownEditor SHALL initialize a Y.Doc and HocuspocusProvider with Collaboration extensions when `collaborative=true`, and SHALL use local StarterKit history when collaboration is disabled.

#### Scenario: Collaboration mode initializes provider

- **Given** the editor is mounted with `collaborative=true` and a `documentName`
- **When** the editor initializes
- **Then** a Y.Doc is created
- **And** a HocuspocusProvider connects to the WebSocket server
- **And** Collaboration and CollaborationCaret extensions are added
- **And** the history extension is disabled (Yjs manages undo)

#### Scenario: Non-collaborative mode uses local history

- **Given** the editor is mounted without `collaborative=true`
- **When** the editor initializes
- **Then** StarterKit includes the history extension
- **And** no Y.Doc or HocuspocusProvider is created

### Requirement: MarkdownEditor draft restore

The MarkdownEditor SHALL display a draft restore banner when a saved draft differs from the current model value, and MUST allow the user to restore or discard the draft.

#### Scenario: Draft restore banner appears when draft exists

- **Given** the editor has a `draftKey` and a saved draft differs from `modelValue`
- **When** the editor mounts
- **Then** a yellow banner shows "You have unsaved changes from a previous session"
- **And** clicking "Restore draft" loads the draft content and emits `update:modelValue`
- **And** clicking "Discard" removes the draft

### Requirement: MarkdownEditor image upload

The MarkdownEditor SHALL support image uploads via the toolbar button, paste, and drag-and-drop, uploading through the campaign image API and inserting the resulting image node.

#### Scenario: Image upload via toolbar button

- **Given** the editor is mounted with a campaignId
- **When** the user clicks the image toolbar button and selects a file
- **Then** the image is uploaded via the campaign image upload API
- **And** an image node is inserted into the editor

#### Scenario: Image upload via paste/drop

- **Given** the editor is mounted with a campaignId
- **When** the user pastes or drops an image file
- **Then** the image is uploaded and inserted into the editor

### Requirement: Characters list page filtering and display

The characters list page SHALL support filtering by type, status, race, class, and folder, SHALL support sorting and search with URL synchronization, and SHALL display character badges and metadata.

#### Scenario: Type filter toggles between All, PCs, NPCs

- **Given** the characters list page is loaded
- **When** the user clicks the "PCs" filter button
- **Then** only PC characters are displayed
- **And** the URL updates with `?type=pc`
- **And** the folder sidebar is hidden (only shown for NPCs)

#### Scenario: NPC folder sidebar appears for NPC filter

- **Given** the characters list page is loaded
- **When** the user selects the "NPCs" type filter
- **And** folders exist for the campaign
- **Then** a folder sidebar appears on the left
- **And** clicking a folder filters characters to that folder
- **And** clicking "All NPCs" clears the folder filter

#### Scenario: Filter bar applies multiple filters simultaneously

- **Given** the characters list page is loaded
- **When** the user selects status="alive", race="Elf", and class="Wizard"
- **Then** only characters matching all three filters are displayed
- **And** the URL updates with all filter parameters

#### Scenario: Sort controls change ordering

- **Given** the characters list page is loaded with characters
- **When** the user changes sort to "Name" and toggles direction to "Asc"
- **Then** characters are ordered alphabetically A-Z
- **And** URL updates with `?sort=name&sortDir=asc`

#### Scenario: Search debounces and filters

- **Given** the characters list page is loaded
- **When** the user types "Strahd" in the search field
- **Then** after a 300ms debounce, the character list filters to matches
- **And** the URL updates with `?search=Strahd`

#### Scenario: Character list item displays all badges

- **Given** a character has race, class, alignment, companion status, location, and organization
- **When** the character list renders
- **Then** the list item shows: portrait, name, type badge (PC/NPC), race, class, alignment, companion indicator, location indicator, organization badge, and status badge with color coding

#### Scenario: Filters initialize from URL on page load

- **Given** the URL contains `?type=npc&status=alive&sort=name`
- **When** the page loads
- **Then** filter controls are pre-set to match the URL parameters
- **And** the character list reflects those filters

### Requirement: Session detail page attendance and decisions

The session detail page SHALL display attendance RSVP statuses with colored indicators, SHALL allow users to update their own RSVP, and SHALL render a decisions timeline with consequences and DM management controls.

#### Scenario: Attendance panel displays RSVP statuses

- **Given** a session has attendance records
- **When** the session detail page loads
- **Then** each attendee shows with a colored dot (green=accepted, red=declined, yellow=pending)
- **And** the user's own RSVP section shows with status buttons

#### Scenario: RSVP button updates attendance

- **Given** the session detail page is loaded
- **When** the user clicks "Accepted" in the RSVP section
- **Then** the RSVP status is sent to the API
- **And** the attendance list refreshes

#### Scenario: DM can mark attendance

- **Given** the user has dm/co_dm role
- **When** the session detail page loads
- **Then** each attendee row shows an "attended" checkbox
- **And** toggling the checkbox sends an update to the API

#### Scenario: Decisions timeline renders with consequences

- **Given** a session has decisions with consequences
- **When** the session detail page loads
- **Then** decisions render in a timeline layout with type badges
- **And** revealed consequences show their description
- **And** hidden consequences show a placeholder for non-DM users
- **And** DM users see hidden consequence text with a "[Hidden]" prefix and a reveal/hide toggle

#### Scenario: Add decision form

- **Given** the user has dm/co_dm role
- **When** the user clicks "Add Decision"
- **Then** a form appears with title, type selector, and description fields
- **And** submitting the form creates the decision and refreshes the list

#### Scenario: Add consequence to decision

- **Given** the user has dm/co_dm role
- **When** the user clicks "+ Add Consequence" under a decision
- **Then** an inline form appears with description and "revealed by default" checkbox
- **And** submitting creates the consequence and refreshes the list

### Requirement: Session detail page rolls and content tabs

The session detail page SHALL lazy-load rolls on expand and SHALL support switching between content tabs (AI Notes, Manual Notes) with per-type editing and saving.

#### Scenario: Rolls table loads on expand

- **Given** a session exists
- **When** the user clicks the "Rolls" heading
- **Then** the rolls section expands
- **And** rolls are fetched from the API (lazy load)
- **And** a table shows user, formula, total, and timestamp for each roll

#### Scenario: Rolls table shows empty state

- **Given** a session has no rolls
- **When** the user expands the rolls section
- **Then** a "No rolls" message is shown

#### Scenario: Content tabs switch between note types

- **Given** a session exists
- **When** the user clicks the "AI Notes" tab
- **Then** the content area shows AI notes content
- **And** the edit/preview toggle applies to the active tab

#### Scenario: Content tab editing saves per-type

- **Given** the user is on the "Manual Notes" content tab
- **When** the user clicks "Edit", modifies the text, and clicks "Save"
- **Then** only the manual_notes content type is sent to the API
- **And** the view returns to preview mode
