# relationship-graph Specification

## Purpose

Typed bidirectional connections between any two entities -- asymmetric labels, attitude scores and rich metadata -- together with the interactive graph for exploring them, rendered with v-network-graph and falling back to cytoscape.js beyond 500 connected entities, offering focus+context highlighting, degree-based node sizing and relation-type edge colouring, an optional `boardSummary` label field for the card layout, and inline relation management from entity detail pages.

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

### Requirement: boardSummary entity field

The system SHALL support an optional `boardSummary` text field on entities, used exclusively for the graph card layout, allowing DMs to write a short board-optimised label separate from the main entity summary.

#### Scenario: boardSummary stored per entity

- **GIVEN** a DM editing an entity via the entity edit form
- **WHEN** they fill in the "Graph label" field (max 120 chars, shown under the Summary field)
- **THEN** the value is saved to the `board_summary` column on the `entities` table
- AND the field is optional; existing entities default to `null`

#### Scenario: boardSummary accepted and validated by PUT /api/campaigns/{id}/entities/{slug}

- **GIVEN** an authenticated PUT request to the entity update endpoint
- **WHEN** the request body includes `boardSummary` as a non-empty string
- **THEN** the value is saved if it is 120 characters or fewer
- AND a 422 error is returned if the value exceeds 120 characters

#### Scenario: boardSummary used in graph card layout

- **GIVEN** the graph card layout is active and an entity has `boardSummary` set
- **WHEN** the node card is rendered
- **THEN** the card displays `boardSummary` instead of the main `summary`

#### Scenario: boardSummary falls back to summary in card layout

- **GIVEN** the graph card layout is active and an entity has no `boardSummary`
- **WHEN** the node card is rendered
- **THEN** the card displays the first 80 characters of `summary` (truncated with ellipsis)
- AND if both are null, only the entity name and type badge are shown

#### Scenario: boardSummary exposed in graph API response

- **GIVEN** an authenticated GET request to `/api/campaigns/{id}/graph`
- **WHEN** the response is serialised
- **THEN** each node object includes a `boardSummary` field (string or null)

#### Scenario: Unauthenticated graph request excludes boardSummary

- **GIVEN** an unauthenticated GET request to `/api/campaigns/{id}/graph`
- **WHEN** the campaign requires authentication
- **THEN** a 401 response is returned
- AND `boardSummary` is never exposed to unauthenticated callers

#### Scenario: boardSummary not used in wiki or search

- **GIVEN** the wiki entity detail page or global search results
- **WHEN** entity summaries are displayed
- **THEN** only the main `summary` field is shown
- AND `boardSummary` does not appear as a searchable or filterable field

#### Scenario: boardSummary accessible via CLI entity update

- **GIVEN** the `aleph entity update` CLI command
- **WHEN** called with `--board-summary "short label"`
- **THEN** the entity's `boardSummary` is updated on the server
- AND `aleph entity show` includes the `boardSummary` value when it is set

### Requirement: Inline relation management from entity detail pages

The system SHALL support full create / edit / delete management of relations directly from the character, organization, and location detail pages, in addition to the existing tldraw diagram and `/relations/*` page entry points.

#### Scenario: Add via detail panel writes the same relation row as /relations/new

- **GIVEN** an editor on a character detail page
- **WHEN** they add a new ally-relation via the detail-page panel
- **THEN** the resulting `entity_relations` row is functionally identical to a row created via `POST /api/campaigns/:id/relations` from the `/relations/new` page
- **AND** the same forward/reverse labels and attitude semantics apply

#### Scenario: Edit via detail panel updates the same row as /relations/[id]/edit

- **GIVEN** an existing relation
- **WHEN** an editor modifies it through the detail-page panel
- **THEN** the underlying `PUT /api/campaigns/:id/relations/:relationId` endpoint is invoked
- **AND** the resulting row is functionally identical to one edited via the `/relations/[id]/edit` page

#### Scenario: Delete via detail panel removes the row bidirectionally

- **GIVEN** a relation visible on both endpoints' detail pages (source and target)
- **WHEN** the editor deletes it from the source's detail panel
- **THEN** the row is removed from `entity_relations`
- **AND** the relation no longer appears on the target's detail page either

### Requirement: Graph and diagram nodes respect entity visibility

The system SHALL exclude any entity (character, organization, or location) whose visibility the requesting/viewing user's role does not meet from appearing as a node in the relationship graph or in a generated/viewed diagram — distinct from the existing per-connection "Connection visibility" requirement, which governs edges, not node/entity inclusion. This applies both when a diagram is generated and, independently, whenever an already-generated diagram is subsequently viewed, since a diagram is a persisted artifact that can outlive the visibility settings in effect at generation time. This filtering SHALL be applied regardless of which persistence format the diagram's stored snapshot is in — a snapshot saved through the single-user REST autosave path and one saved through the real-time sync room persist a structurally different JSON shape for the same logical document, and a viewer's role-based visibility MUST be enforced identically against either.

#### Scenario: Relationship graph excludes a dm_only character node for a player

- **GIVEN** a campaign with a character whose visibility is `dm_only`
- **WHEN** a player requests the relationship graph (`GET /api/campaigns/:id/graph`)
- **THEN** the `dm_only` character does not appear as a node
- **AND** a co_dm or dm requesting the same graph sees it included

#### Scenario: Relationship graph excludes a hidden organization node for a player

- **GIVEN** a campaign with an organization whose visibility is `dm_only`
- **WHEN** a player requests the relationship graph
- **THEN** that organization does not appear as a node
- **AND** its members' `member_of` edges to it are also excluded

#### Scenario: Generating a diagram excludes entities the generating user cannot see

- **GIVEN** an editor generating an entity-graph or faction-web diagram
- **AND** the campaign contains a `dm_only` character and a `dm_only` organization
- **WHEN** the editor triggers `POST /api/campaigns/:id/diagrams/generate`
- **THEN** the generated diagram's shapes do not include those `dm_only` entities

#### Scenario: Viewing a previously-generated diagram still excludes entities the viewer cannot see

- **GIVEN** a diagram generated by a DM before a character's visibility was set to `dm_only`
- **AND** the diagram's stored snapshot already contains a shape for that character
- **WHEN** a player fetches the diagram (`GET /api/campaigns/:id/diagrams/:diagramId/snapshot`)
- **THEN** the shape for that character is omitted from the returned snapshot
- **AND** the DM fetching the same diagram still sees the shape included

#### Scenario: Revealing a previously-hidden organization makes it appear without regenerating the diagram

- **GIVEN** a diagram whose stored snapshot includes a shape for an organization currently set to `dm_only`
- **WHEN** a DM changes that organization's visibility to `members`
- **AND** a player who previously could not see it re-fetches the same diagram
- **THEN** the organization's shape is now included in what the player receives, without the diagram having been regenerated

#### Scenario: Viewing a diagram whose latest snapshot was persisted by the real-time sync room, not by REST autosave

- **GIVEN** a diagram whose latest snapshot row was written by the sync room's own persistence (i.e. shaped as `{documents: [{state, lastChangedClock}], tombstones, schema}`, what `TLSocketRoom.getCurrentSnapshot()` produces — not `{schema, store}`)
- **AND** that snapshot contains a shape referencing a character whose visibility is `dm_only`
- **WHEN** a player fetches the diagram (`GET /api/campaigns/:id/diagrams/:diagramId/snapshot`)
- **THEN** the response is normalized to `{schema, store}` before filtering, so the shape for the `dm_only` character is omitted from the returned snapshot exactly as it would be for a REST-persisted snapshot
- **AND** a DM fetching the same diagram still sees the shape included, and every other shape/page/document record from the sync-persisted snapshot is still present and addressable by id under `store`

#### Scenario: A sync-persisted snapshot round-trips through the REST GET endpoint with its shapes addressable by id

- **GIVEN** a diagram edited through the real-time sync websocket, whose latest snapshot row is therefore in the room's own persisted shape
- **WHEN** any member fetches the diagram (`GET /api/campaigns/:id/diagrams/:diagramId/snapshot`)
- **THEN** the response is `200`, not the room's raw persisted shape
- **AND** `snapshot.store` is an object keyed by record id, and the shape that was written is present under its id with its original `props` intact
