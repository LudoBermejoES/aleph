# graph-interaction Specification

## Purpose

How a user explores the relationship graph: focus+context highlighting that dims everything outside a clicked node's neighbourhood, hover tooltips carrying entity details, edge labels revealed only when relevant to the current interaction, double-click to open an entity's detail page, a per-campaign persisted compact/card layout toggle, and click-to-pan on the mini-map.

## Requirements

### Requirement: Focus+Context node highlighting

The system SHALL support a focus+context interaction mode on the relationship graph where clicking a node highlights its immediate neighborhood and dims everything else.

#### Scenario: Clicking a node to focus

- **GIVEN** a rendered relationship graph with multiple nodes and edges
- **WHEN** the user clicks on a node
- **THEN** the clicked node and all directly connected nodes remain at full opacity (1.0)
- AND all edges connecting the clicked node to its neighbors remain at full opacity
- AND all other nodes and edges transition to 10% opacity (0.1)
- AND the transition completes within 300ms using ease timing

#### Scenario: Clicking a second node while focused

- **GIVEN** a graph with a currently focused node
- **WHEN** the user clicks a different node
- **THEN** the focus shifts to the newly clicked node
- AND the previous focus is cleared
- AND the new node's neighborhood is highlighted at full opacity
- AND all non-neighbor elements dim to 10% opacity

#### Scenario: Clicking the background to clear focus

- **GIVEN** a graph with a currently focused node
- **WHEN** the user clicks on the empty background area
- **THEN** all nodes and edges return to full opacity (1.0)
- AND the transition completes within 300ms

#### Scenario: Hovering a node previews focus

- **GIVEN** a rendered graph with no active focus
- **WHEN** the user hovers over a node
- **THEN** the hovered node and its direct neighbors are highlighted
- AND non-neighbor nodes and edges dim to 30% opacity (0.3)
- AND the dimming is immediate (no transition delay)
- AND moving the mouse away restores all elements to full opacity

#### Scenario: Hover is suppressed during active focus

- **GIVEN** a graph with an active focused node
- **WHEN** the user hovers over any node
- **THEN** the hover preview effect does NOT activate
- AND the focus highlighting remains unchanged

### Requirement: Hover tooltip on graph nodes

The system SHALL display a tooltip when the user hovers over a graph node, showing entity details.

#### Scenario: Hovering a node shows tooltip

- **GIVEN** a rendered relationship graph
- **WHEN** the user hovers over a node for at least 200ms
- **THEN** a tooltip appears positioned above the node
- AND the tooltip displays: entity name, entity type, portrait thumbnail (if available), and number of connections
- AND the tooltip is styled as a floating HTML element (not SVG)

#### Scenario: Tooltip disappears on mouse leave

- **GIVEN** a visible tooltip on a hovered node
- **WHEN** the user moves the mouse away from the node
- **THEN** the tooltip disappears immediately

#### Scenario: Tooltip clamped to viewport

- **GIVEN** a node near the edge of the graph container
- **WHEN** the user hovers over it
- **THEN** the tooltip is repositioned to remain fully visible within the container bounds

### Requirement: Edge labels shown on demand

The system SHALL hide edge labels by default and show them only when relevant to the user's current interaction.

#### Scenario: Edge labels hidden by default

- **GIVEN** a rendered relationship graph
- **WHEN** no node is focused or hovered
- **THEN** no edge labels are visible on any edge

#### Scenario: Edge labels shown on node focus

- **GIVEN** a graph with a focused node
- **WHEN** the focus is active
- **THEN** edge labels appear on all edges connected to the focused node
- AND edge labels on non-connected edges remain hidden

#### Scenario: Edge labels shown on node hover

- **GIVEN** a graph with no active focus
- **WHEN** the user hovers over a node
- **THEN** edge labels appear on all edges connected to the hovered node
- AND edge labels on non-connected edges remain hidden

### Requirement: Double-click node to navigate

The system SHALL navigate to the entity's detail page when a user double-clicks a graph node.

#### Scenario: Double-clicking a character node

- **GIVEN** a rendered graph containing character nodes
- **WHEN** the user double-clicks on a character node
- **THEN** the browser navigates to `/campaigns/{campaignId}/characters/{slug}`

#### Scenario: Double-clicking a non-character entity node

- **GIVEN** a rendered graph containing non-character entity nodes
- **WHEN** the user double-clicks on an entity node
- **THEN** the browser navigates to `/campaigns/{campaignId}/entities/{slug}`

### Requirement: Card layout toggle interaction

The system SHALL provide a toolbar toggle that switches the graph between compact node display and card node display, with the state persisted per campaign.

#### Scenario: Toggling card layout from the toolbar

- **GIVEN** the campaign graph is open in compact mode
- **WHEN** the user clicks "Card view" in the graph toolbar
- **THEN** all nodes transition to card display (name, type badge, summary visible on node)
- AND the toolbar button label changes to "Compact view"
- AND the toggle state is saved to `localStorage` under key `graph-layout-mode:{campaignId}`

#### Scenario: Toggling back to compact mode

- **GIVEN** the campaign graph is open in card mode
- **WHEN** the user clicks "Compact view" in the graph toolbar
- **THEN** all nodes return to circle/avatar display
- AND the `localStorage` value is updated to `compact`

### Requirement: Mini-map click-to-pan interaction

The system SHALL allow clicking anywhere on the mini-map to pan the main graph viewport to the clicked position.

#### Scenario: Clicking mini-map to pan

- **GIVEN** the mini-map is visible (graph has 30+ nodes)
- **WHEN** the user clicks a position on the mini-map
- **THEN** the main graph pans so the corresponding world-space position is centered in the viewport
- AND the mini-map viewport rectangle updates immediately to reflect the new position

#### Scenario: Mini-map drag-to-pan

- **GIVEN** the mini-map is visible
- **WHEN** the user drags the viewport rectangle on the mini-map
- **THEN** the main graph pans in real time to follow the drag
- AND releasing the drag finalises the pan position
