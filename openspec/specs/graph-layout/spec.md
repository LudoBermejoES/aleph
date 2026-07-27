# graph-layout Specification

## Purpose

How the campaign-wide relationship graph is drawn: a tuned d3-force simulation that stays readable at 20-100 nodes, nodes sized by connection degree, edges coloured by relation type slug with line-style variants, organization clustering through both force positioning and visual grouping, and a graph API response carrying the relation type and organization membership data those require.

## Requirements

### Requirement: Custom force simulation parameters

The system SHALL use a tuned d3-force simulation for the campaign-wide graph to produce readable layouts for 20-100 nodes.

#### Scenario: Force simulation produces spread layout

- **GIVEN** a campaign with 20+ connected entities
- **WHEN** the campaign graph page is opened
- **THEN** the force simulation uses charge strength of -200, link distance of 100, collision radius scaled by node degree, and alphaDecay of 0.015
- AND nodes do not overlap after the simulation settles
- AND the graph fits within the viewport with autoPanAndZoomOnLoad

#### Scenario: Nodes can be dragged and pinned

- **GIVEN** a rendered force-directed graph
- **WHEN** the user drags a node to a new position
- **THEN** the node is pinned at that position and excluded from further force calculations
- AND other nodes continue to be affected by the simulation

### Requirement: Node sizing by connection degree

The system SHALL size graph nodes proportionally to their number of connections, making highly-connected entities visually prominent.

#### Scenario: Hub nodes appear larger

- **GIVEN** a graph where node A has 10 connections and node B has 1 connection
- **WHEN** the graph is rendered
- **THEN** node A's radius is larger than node B's radius
- AND the radius formula is `baseRadius + scaleFactor * sqrt(degree)` where baseRadius=14 and scaleFactor=3
- AND the collision detection radius matches the visual radius plus padding

#### Scenario: Isolated nodes have minimum size

- **GIVEN** a node with 0 connections that appears in the graph
- **WHEN** the graph is rendered
- **THEN** the node has the minimum radius of 14px

### Requirement: Edge color by relation type

The system SHALL color graph edges based on the relation type slug, using a consistent categorical palette across the campaign graph, AND SHALL additionally apply line style variants (solid/dashed/dotted) and directional SVG markers based on relation type category.

#### Scenario: Relation type colors are applied

- **GIVEN** edges in the graph with various relation type slugs
- **WHEN** the campaign graph is rendered
- **THEN** edges are colored according to this mapping:

| Slug pattern            | Color  | Hex     |
| ----------------------- | ------ | ------- |
| ally, allied_with       | Green  | #22c55e |
| enemy, at_war_with      | Red    | #ef4444 |
| rival                   | Orange | #f97316 |
| mentor                  | Amber  | #f59e0b |
| family:\*               | Purple | #a855f7 |
| member_of, leader_of    | Blue   | #3b82f6 |
| located_in, occurred_at | Cyan   | #06b6d4 |
| owns, created_by        | Yellow | #eab308 |
| worships                | Pink   | #ec4899 |
| custom                  | Gray   | #6b7280 |
| (default)               | Gray   | #6b7280 |

#### Scenario: Relation type line styles are applied

- **GIVEN** edges in the graph with various relation type slugs
- **WHEN** the campaign graph is rendered
- **THEN** edges receive `stroke-dasharray` based on their category:

| Category                 | stroke-dasharray |
| ------------------------ | ---------------- |
| ally / allied_with       | none (solid)     |
| enemy / at_war_with      | none (solid)     |
| rival                    | 8,4 (dashed)     |
| mentor / student         | none (solid)     |
| family (all subtypes)    | none (solid)     |
| located_in / occurred_at | 2,4 (dotted)     |
| owns / created_by        | 8,4 (dashed)     |
| custom                   | none (solid)     |

- AND SVG marker references (`marker-end`, `marker-start`) are set per the directionality rules in the graph-enhancements spec

#### Scenario: Edge style mapping function is pure and testable

- **GIVEN** a relation type slug string
- **WHEN** the `getEdgeStyle(slug)` utility in `app/utils/graph-helpers.ts` is called
- **THEN** it returns `{ color: string, dasharray: string, markerStart: string | null, markerEnd: string | null }`
- AND the function has no side effects and can be unit-tested in isolation

#### Scenario: Color legend is visible

- **GIVEN** a rendered campaign graph with edges
- **WHEN** the graph is displayed
- **THEN** a color legend appears below the graph showing each relation type present and its color

#### Scenario: Character detail graph keeps attitude coloring

- **GIVEN** a character detail page with a relationship graph
- **WHEN** the graph is rendered
- **THEN** edges are colored by attitude score (red for negative, green for positive, gray for neutral)
- AND the relation type color palette is NOT used

### Requirement: Faction/organization clustering

The system SHALL visually cluster graph nodes that belong to the same organization, using both force-directed positioning and visual grouping.

#### Scenario: Organization members cluster together

- **GIVEN** a campaign where characters belong to organizations (e.g., "La Familia", "La Fuerza Oculta")
- **WHEN** the campaign graph is rendered
- **THEN** nodes belonging to the same organization are positioned closer together than unrelated nodes
- AND a soft cluster force pulls organization members toward their group centroid

#### Scenario: Convex hull backgrounds show faction boundaries

- **GIVEN** an organization with 3 or more members visible in the graph
- **WHEN** the graph is rendered
- **THEN** a semi-transparent filled polygon (convex hull) is drawn behind the organization's nodes
- AND the hull has 20px padding around the outermost nodes
- AND the hull color is a desaturated version of the organization's theme color (or a default palette color)
- AND the hull updates its shape as nodes move during simulation

#### Scenario: Nodes in multiple organizations

- **GIVEN** a node that belongs to two organizations
- **WHEN** the graph is rendered
- **THEN** the node appears inside the hull of the organization it is closest to
- AND it is included in both hulls' boundary calculations

### Requirement: Graph API includes relation type and organization data

The system SHALL extend the graph API response to include relation type slugs per edge and organization membership per node.

#### Scenario: Graph API returns relation type slugs

- **GIVEN** an authenticated user requesting GET /api/campaigns/{id}/graph
- **WHEN** the response is returned
- **THEN** each edge object includes a `relationTypeSlug` field with the slug of the relation type

#### Scenario: Graph API returns organization memberships

- **GIVEN** an authenticated user requesting GET /api/campaigns/{id}/graph
- **WHEN** the response is returned
- **THEN** each node object includes an `organizations` field: an array of `{ slug, name }` objects for each organization the entity belongs to

#### Scenario: Unauthenticated request returns 401

- **GIVEN** an unauthenticated request to GET /api/campaigns/{id}/graph
- **WHEN** the request is processed
- **THEN** the server returns HTTP 401
