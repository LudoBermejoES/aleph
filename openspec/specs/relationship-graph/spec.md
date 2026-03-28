# relationship-graph Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Bidirectional Entity Connections

The system SHALL support creating typed, bidirectional connections between any two entities with asymmetric labels, attitude scores, and rich metadata.

#### Scenario: Creating a connection
- GIVEN a DM or Editor creating a relationship between two entities
- WHEN they specify a relation type (e.g., "family:parent")
- THEN a single connection record is created with forward and reverse labels (e.g., "parent of" / "child of")
- AND the connection appears on both entities' profile pages
- AND modifying or deleting the connection affects both sides simultaneously

#### Scenario: Built-in relation types
- GIVEN the system defines these relation types with default labels:
  | Type | Forward Label | Reverse Label |
  |------|--------------|---------------|
  | ally | ally of | ally of |
  | enemy | enemy of | enemy of |
  | rival | rival of | rival of |
  | mentor | mentor of | student of |
  | family:parent | parent of | child of |
  | family:sibling | sibling of | sibling of |
  | family:spouse | spouse of | spouse of |
  | member_of | member of | has member |
  | leader_of | leader of | led by |
  | located_in | located in | contains |
  | owns | owns | owned by |
  | created_by | created by | creator of |
  | occurred_at | occurred at | site of |
  | worships | worships | worshipped by |
  | allied_with | allied with | allied with |
  | at_war_with | at war with | at war with |
  | custom | (user-defined) | (user-defined) |
- WHEN a user creates a connection
- THEN they can select a built-in type (which pre-fills labels) or choose "custom" and provide their own labels

#### Scenario: Attitude scores
- GIVEN a connection between two entities
- WHEN the user sets an attitude score (-100 to +100)
- THEN the graph view colors the edge accordingly (red for negative, green for positive, gray for neutral)
- AND the score appears in the connection detail view

#### Scenario: Connection metadata
- GIVEN a connection between two entities
- WHEN the user adds description text or metadata
- THEN the connection stores: description text, JSON metadata (e.g., `{"since": "Year 1302", "secret": true}`)
- AND the description appears in tooltips and detail views
- AND metadata can be queried via SQLite JSON functions

#### Scenario: Connection visibility
- GIVEN a connection with a visibility level
- WHEN a user without sufficient permission views either entity
- THEN the connection is completely hidden (not shown as redacted)
- AND the connected entity does not appear in the relationship list

### Requirement: Interactive Relationship Graph View

The system SHALL provide an interactive visual graph for exploring entity connections with focus+context highlighting, degree-based node sizing, relation-type edge coloring, on-demand edge labels, faction clustering, and hover tooltips.

#### Scenario: Entity-centered graph
- GIVEN a user viewing an entity's detail page
- WHEN they open the "Connections" or "Graph" tab
- THEN an interactive graph renders with:
  - The current entity as the center node (radial layout)
  - All directly connected entities as surrounding nodes
  - Edges labeled with the relationship label (from the current entity's perspective)
  - Edges colored by attitude score
  - Nodes sized by their connection degree
- AND nodes display the entity name, type, and portrait image (if available)
- AND clicking a node navigates to that entity
- AND double-clicking a node navigates to the entity's detail page

#### Scenario: Campaign-wide connection web
- GIVEN a campaign with many entity connections
- WHEN a DM or Editor opens the campaign connection web view
- THEN all entities with at least one connection are shown in a force-directed graph with tuned simulation parameters
- AND nodes are sized by connection degree
- AND edges are colored by relation type (categorical palette)
- AND nodes belonging to the same organization cluster together with convex hull backgrounds
- AND the user can filter by entity type, relation type, or tag
- AND the user can zoom, pan, and drag nodes to rearrange
- AND a color legend shows the relation type palette

#### Scenario: Graph interaction
- GIVEN the graph view is displayed
- WHEN a user interacts with it
- THEN they can:
  - Zoom in/out (scroll wheel)
  - Pan (click and drag background)
  - Drag individual nodes to reposition and pin them
  - Click a node to focus (highlight neighborhood, dim the rest)
  - Click background to clear focus
  - Hover a node to preview focus and see tooltip
  - Double-click a node to navigate to the entity page
  - See edge labels only for focused/hovered node's connections

#### Scenario: Graph node tooltip
- GIVEN a rendered relationship graph
- WHEN the user hovers over a node
- THEN a tooltip shows: entity name, type badge, portrait thumbnail, connection count
- AND the tooltip is positioned above the node and clamped to viewport bounds

### Requirement: Graph Visualization Technology

The system SHALL use v-network-graph (native Vue 3 SVG component) for rendering the relationship graph, with cytoscape.js as a fallback for campaigns exceeding 500 connected entities.

#### Scenario: Performance boundaries
- GIVEN a campaign with entity connections
- WHEN the graph view is requested
- THEN for campaigns with up to 500 connected nodes, v-network-graph renders with full interactivity
- AND for campaigns exceeding 500 nodes, the system either switches to cytoscape.js (canvas-based) or limits the visible graph depth (e.g., 2 hops from a selected entity)

### Requirement: Graph Rendering

The system SHALL render entity connection graphs using v-network-graph.

#### Scenario: Rendering a relationship graph
- GIVEN a set of entities with defined relationships in a campaign
- WHEN the user opens the relationship graph view
- THEN v-network-graph renders nodes for each entity and edges for each relationship
- AND nodes are labeled with the entity name and type icon

#### Scenario: Interacting with graph nodes
- GIVEN a rendered relationship graph
- WHEN the user clicks on a node
- THEN a detail panel shows the entity summary and its direct connections
- AND the user can navigate to the full entity page from the panel

