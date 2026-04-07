## ADDED Requirements

### Requirement: Entity details popover on double-click

The system SHALL display an inline floating popover when a user double-clicks any entity-linked shape (`npcToken`, `entityCard`, `locationPin`, `questNode`, `factionCard`). The popover shows the entity portrait, name, type badge, a 2–3 line content preview, tag chips, and an "Open full page" link. A secondary "Open in new tab" link replaces the previous default behavior.

#### Scenario: Double-click on NPCToken shows popover

- **GIVEN** an `npcToken` shape on the canvas
- **WHEN** the user double-clicks it
- **THEN** an `EntityPopover.vue` component appears near the click coordinates, showing the character's portrait, name, type, content preview, and tags

#### Scenario: Popover fetches content preview lazily

- **GIVEN** the entity popover opens
- **WHEN** the popover mounts
- **THEN** a `GET /api/campaigns/:id/entities/:slug` request is made to fetch the full entity (including content) and the preview updates when the response arrives

#### Scenario: Popover closes on click outside

- **GIVEN** an entity popover is open
- **WHEN** the user clicks anywhere outside the popover
- **THEN** the popover closes

#### Scenario: "Open full page" navigates within the app

- **GIVEN** an entity popover is open
- **WHEN** the user clicks "Open full page"
- **THEN** `useRouter().push()` navigates to the entity's detail page in the same tab

#### Scenario: "Open in new tab" opens entity in a new browser tab

- **GIVEN** an entity popover is open
- **WHEN** the user clicks "Open in new tab"
- **THEN** `window.open(url, '_blank')` opens the entity page in a new tab and the popover closes

#### Scenario: Popover does not open in read-only mode

- **GIVEN** the diagram is in read-only mode (player viewing)
- **WHEN** the user double-clicks an entity shape
- **THEN** no popover appears; the shape is not editable

### Requirement: Status and tag badges on NPCToken

The system SHALL display a `statusBadge` indicator and up to 3 tag chips on `npcToken` shapes. The `statusBadge` is a small colored circle in the upper-right corner of the portrait frame. Tag chips render at the bottom of the shape. Both are populated by the entity hydration system and are DM-only visible.

#### Scenario: statusBadge alive renders green circle

- **GIVEN** an `npcToken` with `statusBadge: 'alive'`
- **WHEN** it is rendered
- **THEN** a small green filled circle appears in the upper-right corner of the portrait

#### Scenario: statusBadge dead renders gray skull indicator

- **GIVEN** an `npcToken` with `statusBadge: 'dead'`
- **WHEN** it is rendered
- **THEN** a gray indicator with a ✕ or skull icon appears in the upper-right corner

#### Scenario: statusBadge hostile renders red circle

- **GIVEN** an `npcToken` with `statusBadge: 'hostile'`
- **WHEN** it is rendered
- **THEN** a red filled circle appears in the upper-right corner

#### Scenario: tag chips render at bottom of shape

- **GIVEN** an `npcToken` with `tags: ['villain', 'mage']`
- **WHEN** it is rendered
- **THEN** two small colored tag chips appear below the name label

#### Scenario: more than 3 tags shows truncated with count

- **GIVEN** an `npcToken` with 5 tags
- **WHEN** it is rendered
- **THEN** the first 2 tags are shown as chips plus a "+3" overflow chip

#### Scenario: badges are hidden for player-role users

- **GIVEN** a player-role user opens a diagram with an NPCToken
- **WHEN** the batch hydration runs
- **THEN** `statusBadge` and `tags` are not returned in the batch response for that user's role

### Requirement: Focus camera from entity panel on already-placed entity

The system SHALL focus the diagram canvas camera on the first instance of an entity's shape when the user clicks an entity in the entity panel that is already placed on the canvas, instead of placing a duplicate.

#### Scenario: Click on placed entity in panel focuses camera

- **GIVEN** an NPCToken for "Aldric" exists on the canvas
- **AND** "Aldric" appears in the entity panel with a "placed" badge
- **WHEN** the user clicks "Aldric" in the panel (without dragging)
- **THEN** `editor.zoomToShape(shapeId, { animation: { duration: 300 } })` is called and the canvas pans/zooms to that shape

#### Scenario: Drag from panel still creates new shape

- **GIVEN** an entity is already placed on the canvas
- **WHEN** the user drags the entity from the panel onto the canvas
- **THEN** a new shape is created (existing multi-instance behavior preserved)

#### Scenario: Multiple instances — camera focuses on first placed shape

- **GIVEN** three NPCToken shapes for the same entity exist on the canvas
- **WHEN** the user clicks the entity in the panel
- **THEN** the camera focuses on the shape with the earliest creation timestamp

### Requirement: Diagram type filter mode

The system SHALL provide a toolbar toggle that filters the visible shapes on the canvas to show only one entity type at a time (characters, locations, organizations, quests, wiki) or all types. Filtering is non-destructive (shapes remain in the store) and does not persist across sessions.

#### Scenario: Filter to "characters only" hides non-character shapes

- **GIVEN** a diagram with NPCTokens, locationPins, and questNodes
- **WHEN** the user selects "Characters" in the filter toggle
- **THEN** locationPin and questNode shapes have opacity set to 0 (hidden), NPCTokens remain at opacity 1

#### Scenario: "All" filter restores all shapes

- **GIVEN** a filter is active
- **WHEN** the user selects "All" in the filter toggle
- **THEN** all shapes are restored to opacity 1

#### Scenario: Filter state does not persist after page navigation

- **GIVEN** a type filter is active
- **WHEN** the user navigates away from the diagram and returns
- **THEN** all shapes are visible (filter defaults to "All")

#### Scenario: Filter toggle is disabled when canvas has no shapes

- **GIVEN** an empty diagram canvas
- **WHEN** the filter toolbar is rendered
- **THEN** all filter buttons are disabled

### Requirement: Auto-layout reflow toolbar button

The system SHALL provide a "Reflow" toolbar button in the diagram editor that repositions all entity-linked shapes on the canvas using the server-side layout algorithm, while preserving their shape type and data. The reflow respects the diagram's current `diagramType` (entity-graph → grid, quest-tree → tree, faction-web → radial, session-timeline → linear).

#### Scenario: Reflow button repositions shapes cleanly

- **GIVEN** a diagram with cluttered entity shapes
- **WHEN** the user clicks the "Reflow" button
- **THEN** a `POST /api/campaigns/:id/diagrams/reflow` request is made with current shape entity IDs, and the response provides new `x/y` positions; `editor.updateShapes()` animates shapes to new positions

#### Scenario: Reflow only moves entity-linked shapes

- **GIVEN** a diagram with entity shapes, a `regionBox`, and a `stickyNote`
- **WHEN** reflow runs
- **THEN** only the entity-linked shapes are repositioned; `regionBox` and `stickyNote` remain in place

#### Scenario: Reflow is DM/editor-only

- **GIVEN** a player-role user views a diagram
- **WHEN** the diagram toolbar is rendered
- **THEN** the "Reflow" button is not shown
