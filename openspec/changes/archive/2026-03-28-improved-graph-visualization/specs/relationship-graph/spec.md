## MODIFIED Requirements

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
