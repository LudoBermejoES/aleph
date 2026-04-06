## ADDED Requirements

### Requirement: EntityCard shape

A custom tldraw shape that displays an entity's name, type icon, and optional portrait thumbnail.

#### Scenario: Render entity card

- **WHEN** an EntityCard shape is on the canvas
- **THEN** it renders as a rounded rectangle with the entity name, a type icon (character, location, organization, item), and a portrait image if available

#### Scenario: Double-click to navigate

- **WHEN** a user double-clicks an EntityCard shape
- **THEN** the linked entity page opens in a new tab (`/campaigns/:id/entities/:slug`)

#### Scenario: Entity card props

- **WHEN** an EntityCard is created
- **THEN** it stores `entityId`, `campaignId`, `entityName`, `entityType`, and `portraitUrl` in its shape props

### Requirement: QuestNode shape

A custom tldraw shape that displays a quest title with status-based coloring.

#### Scenario: Render quest node

- **WHEN** a QuestNode shape is on the canvas
- **THEN** it renders with the quest title and a color-coded background: blue for active, green for completed, red for failed, gray for not started

#### Scenario: Double-click to navigate

- **WHEN** a user double-clicks a QuestNode shape
- **THEN** the linked quest detail page opens in a new tab

### Requirement: LocationPin shape

A compact map-pin style shape with a location name label.

#### Scenario: Render location pin

- **WHEN** a LocationPin shape is on the canvas
- **THEN** it renders as a pin icon with the location name below it

### Requirement: NPCToken shape

A circular token shape with character name and portrait.

#### Scenario: Render NPC token

- **WHEN** an NPCToken shape is on the canvas
- **THEN** it renders as a circle with the character portrait (or initials) and name below

### Requirement: Shape registration

All custom shapes are registered with the tldraw editor via the `shapeUtils` configuration.

#### Scenario: Custom shapes available in editor

- **WHEN** the tldraw canvas is initialized
- **THEN** EntityCard, QuestNode, LocationPin, and NPCToken shapes can be created programmatically and render correctly

#### Scenario: Custom shapes in toolbar

- **WHEN** a user is in edit mode on a diagram that was generated
- **THEN** custom shapes already on the canvas are fully interactive (selectable, movable, resizable, deletable)
