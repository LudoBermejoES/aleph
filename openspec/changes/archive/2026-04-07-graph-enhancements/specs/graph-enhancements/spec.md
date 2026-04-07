## ADDED Requirements

### Requirement: Node card layout option

The system SHALL offer a "card" display mode for graph nodes that shows the entity name, type badge, and a one-line summary directly on the node, in addition to the current compact circle/avatar layout.

#### Scenario: Toggle between compact and card layouts

- **GIVEN** the campaign graph page is open
- **WHEN** the user clicks the "Card view / Compact view" toggle button in the graph toolbar
- **THEN** all nodes switch between compact (circle with portrait/icon) and card (rectangular card with name, type badge, and summary)
- AND the toggle state is persisted in `localStorage` keyed by campaign ID

#### Scenario: Card nodes render at fixed width

- **GIVEN** card layout is active
- **WHEN** nodes are rendered
- **THEN** all card nodes have a fixed width of 160px and auto-height based on content
- AND the force simulation uses a bounding-circle collision radius of `max(80, height/2) * 1.1`
- AND cards with portraits show a 32×32px thumbnail left of the name

#### Scenario: Card layout falls back gracefully when no summary exists

- **GIVEN** card layout is active and a node has no `summary` and no `boardSummary`
- **WHEN** the node is rendered
- **THEN** the card shows only the entity name and type badge
- AND the card height adjusts to fit without a summary row

#### Scenario: Card layout is disabled in Cytoscape mode

- **GIVEN** a campaign graph with more than 500 nodes (Cytoscape fallback mode)
- **WHEN** the card layout toggle is visible
- **THEN** the toggle is disabled
- AND a tooltip reads "Card layout unavailable for large graphs"

### Requirement: Edge style variants by relation type

The system SHALL apply distinct line styles (solid/dashed/dotted) and directional marker shapes to edges based on their relation type category.

#### Scenario: Line styles applied per relation category

- **GIVEN** edges rendered in the campaign graph
- **WHEN** the graph loads
- **THEN** edges receive line styles according to this mapping:
  | Category | stroke-dasharray | Markers |
  |---|---|---|
  | ally / allied_with | none | arrow both ends |
  | enemy / at_war_with | none | arrow both ends |
  | rival | 8,4 | arrow both ends |
  | mentor / student | none | arrow toward student end |
  | family (all subtypes) | none | none |
  | located_in / occurred_at | 2,4 | arrow toward location |
  | owns / created_by | 8,4 | arrow toward owner |
  | custom | none | arrow both ends |
- AND existing `RELATION_TYPE_COLORS` color coding is preserved alongside the line style

#### Scenario: SVG markers defined in defs

- **GIVEN** the `EntityGraphView` component mounts
- **WHEN** the SVG is initialised
- **THEN** arrow, diamond, and circle marker definitions are added to the SVG `<defs>` block
- AND each edge references the correct marker via `marker-end` and/or `marker-start` attributes

#### Scenario: Line style legend entries updated

- **GIVEN** the GraphLegend component renders
- **WHEN** the graph contains edges with varied line styles
- **THEN** each legend entry shows a short line sample (solid, dashed, or dotted) next to the color swatch
- AND the line sample matches the actual style applied to edges of that type

### Requirement: Mini-map navigation panel

The system SHALL show a mini-map thumbnail of the full graph with a viewport indicator when the graph has 30 or more visible nodes.

#### Scenario: Mini-map appears for graphs with 30+ nodes

- **GIVEN** a campaign graph with 30 or more visible nodes
- **WHEN** the graph renders
- **THEN** a mini-map panel appears in the bottom-right corner of the graph container
- AND the mini-map shows node positions as dots and edges as 1px lines
- AND a semi-transparent rectangle indicates the current viewport region

#### Scenario: Mini-map hidden for small graphs

- **GIVEN** a campaign graph with fewer than 30 visible nodes
- **WHEN** the graph renders
- **THEN** no mini-map is shown and no space is reserved for it

#### Scenario: Clicking the mini-map pans the main graph

- **GIVEN** the mini-map is visible
- **WHEN** the user clicks a location on the mini-map
- **THEN** the main graph viewport pans so that location becomes the center of the visible area
- AND the viewport rectangle on the mini-map updates to reflect the new position

#### Scenario: Mini-map viewport rectangle updates on pan/zoom

- **GIVEN** the mini-map is visible and the user pans or zooms the main graph
- **WHEN** the pan or zoom event fires
- **THEN** the viewport rectangle on the mini-map redraws within one animation frame

#### Scenario: Mini-map can be collapsed

- **GIVEN** the mini-map is visible
- **WHEN** the user clicks the collapse chevron on the mini-map panel
- **THEN** the mini-map collapses to a small icon button
- AND the collapsed state is saved in `localStorage`

### Requirement: Icon chip type filters

The system SHALL replace the entity type filter checkboxes with icon chip buttons and add a "show only connected nodes" toggle.

#### Scenario: Entity type filter chips rendered

- **GIVEN** the campaign graph toolbar is rendered
- **WHEN** type filters are shown
- **THEN** each entity type appears as a pill/chip button with the type's icon (from `ICONS` in `app/utils/icons.ts`) and short label
- AND active types are visually highlighted (filled background)
- AND inactive types appear dimmed (outline style)

#### Scenario: Clicking a chip toggles that type

- **GIVEN** the type filter chips are visible and a type is active
- **WHEN** the user clicks that chip
- **THEN** nodes of that type are hidden from the graph with a brief fade
- AND edges connecting to those nodes are also hidden

#### Scenario: "All" chip restores all types

- **GIVEN** some entity type chips are inactive
- **WHEN** the user clicks the "All" chip at the start of the chip row
- **THEN** all entity types become visible and all chips become active

#### Scenario: "Connected only" toggle hides isolated nodes

- **GIVEN** the campaign graph contains nodes with zero edges
- **WHEN** the user activates the "Connected only" toggle
- **THEN** nodes with zero edges are hidden from the graph
- AND a count badge shows how many nodes are hidden (e.g., "3 hidden")
- AND the graph re-layouts to use the freed space

#### Scenario: Filter and toggle state persists per campaign

- **GIVEN** a user has set type filters and the "connected only" toggle
- **WHEN** the user navigates away and returns to the graph
- **THEN** the same filter state is restored from `localStorage` keyed by campaign ID
