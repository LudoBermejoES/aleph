## ADDED Requirements

### Requirement: Collapsible entity sidebar

A collapsible sidebar on the left of the diagram editor allows users to search and browse all campaign entities.

#### Scenario: Toggle sidebar

- **WHEN** the user clicks the collapse/expand button
- **THEN** the sidebar opens or closes; collapsed state is persisted to localStorage and restored on next visit

#### Scenario: Sidebar hidden for players and visitors

- **WHEN** a player or visitor opens the diagram editor
- **THEN** the entity panel is not rendered

### Requirement: Unified entity search

A debounced search input queries all entity types in the campaign.

#### Scenario: Search across all types

- **WHEN** the user types in the search box
- **THEN** after 300ms debounce, results are returned grouped by type: Characters, Locations, Organizations, Items, Quests, Entities (wiki)

#### Scenario: Empty search shows recent or all entities

- **WHEN** the search box is empty
- **THEN** all entities are listed grouped by type (or a reasonable cap, e.g. 10 per type)

#### Scenario: No results

- **WHEN** the search query matches nothing
- **THEN** an empty state message is shown

### Requirement: Entity card display

Each entity in the panel shows a portrait image (or type icon placeholder) and the entity name.

#### Scenario: Entity with portrait

- **WHEN** an entity has an associated portrait/image
- **THEN** it is shown as a small square thumbnail

#### Scenario: Entity without portrait

- **WHEN** an entity has no portrait
- **THEN** a type-specific icon placeholder is shown (e.g., person icon for characters, map-pin for locations)

### Requirement: Drag to canvas

Entities are dragged from the panel onto the canvas to place them as custom shapes.

#### Scenario: Drag entity onto canvas

- **WHEN** the user drags an entity card from the panel and drops it on the canvas
- **THEN** the appropriate custom shape (EntityCard, QuestNode, LocationPin, NPCToken) is created at the drop position in canvas coordinates

#### Scenario: Drop coordinates converted to canvas space

- **WHEN** an entity is dropped at screen position (x, y)
- **THEN** the shape is placed at the corresponding canvas page position using `editor.screenToPage(x, y)`

### Requirement: Already-placed badge indicator

Entities already present on the canvas show a badge in the panel.

#### Scenario: Entity on canvas

- **WHEN** an entity has one or more shapes on the canvas referencing its entityId
- **THEN** a badge showing the count (e.g. ①) appears on its panel card

#### Scenario: Entity removed from canvas

- **WHEN** all shapes for an entity are deleted from the canvas
- **THEN** the badge disappears from the panel card

#### Scenario: Badge updates reactively

- **WHEN** the canvas content changes (shape added or deleted)
- **THEN** the badge indicators update without requiring a page reload
