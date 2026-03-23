# Aleph -- Relationship Graph Specification

## Purpose

Define the bidirectional entity connection system and its interactive visual graph view. Relationships are the connective tissue of a campaign world -- tracking alliances, family ties, faction memberships, rivalries, and any user-defined connection between entities.

Inspired by: Kanka (connections with attitude scores, relation explorer, mirrored relations), Scabard (Neo4j graph, auto-bidirectional, interactive graph tab), World Anvil (diplomacy webs for organizations)

## ADDED Requirements

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

The system SHALL provide an interactive visual graph for exploring entity connections.

#### Scenario: Entity-centered graph
- GIVEN a user viewing an entity's detail page
- WHEN they open the "Connections" or "Graph" tab
- THEN an interactive force-directed graph renders with:
  - The current entity as the center node
  - All directly connected entities as surrounding nodes
  - Edges labeled with the relationship label (from the current entity's perspective)
  - Edges colored by attitude score
- AND nodes display the entity name, type icon, and thumbnail image
- AND clicking a node navigates to that entity

#### Scenario: Campaign-wide connection web
- GIVEN a campaign with many entity connections
- WHEN a DM or Editor opens the campaign connection web view
- THEN all entities with at least one connection are shown in a force-directed graph
- AND the user can filter by entity type, relation type, or tag
- AND the user can zoom, pan, and drag nodes to rearrange
- AND tooltips show connection details on hover

#### Scenario: Graph interaction
- GIVEN the graph view is displayed
- WHEN a user interacts with it
- THEN they can:
  - Zoom in/out (scroll wheel)
  - Pan (click and drag background)
  - Drag individual nodes to reposition
  - Click a node to navigate to the entity
  - Hover an edge to see the relationship label and attitude
  - Right-click a node for a context menu (view, edit, add connection)

### Requirement: Graph Visualization Technology

The system SHALL use v-network-graph (native Vue 3 SVG component) for rendering the relationship graph, with cytoscape.js as a fallback for campaigns exceeding 500 connected entities.

#### Scenario: Performance boundaries
- GIVEN a campaign with entity connections
- WHEN the graph view is requested
- THEN for campaigns with up to 500 connected nodes, v-network-graph renders with full interactivity
- AND for campaigns exceeding 500 nodes, the system either switches to cytoscape.js (canvas-based) or limits the visible graph depth (e.g., 2 hops from a selected entity)
