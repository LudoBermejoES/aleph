## 1. API Extension

- [x] 1.1 Extend `GET /api/campaigns/[id]/graph` to include `relationTypeSlug` per edge by joining `entityRelations` with `relationTypes`
- [x] 1.2 Extend `GET /api/campaigns/[id]/graph` to include `organizations` array per node by joining entities with `organizationMembers` and `organizations` tables
- [x] 1.3 Update TypeScript type `GraphData` in `types/api.ts` to include `relationTypeSlug` on edges and `organizations` on nodes

## 2. Core Graph Utilities

- [x] 2.1 Create `app/utils/graph-helpers.ts` with: `computeDegreeMap(edges)`, `computeNeighborSet(nodeId, edges)`, `RELATION_TYPE_COLORS` palette map, `relationTypeColor(slug)` function
- [x] 2.2 Add `computeNodeRadius(degree)` function (formula: `14 + 3 * sqrt(degree)`)
- [x] 2.3 Add unit tests for all graph helper functions in `tests/unit/utils/graph-helpers.test.ts`

## 3. Custom ForceLayout

- [x] 3.1 Create a `createGraphSimulation` factory in `app/utils/graph-helpers.ts` that returns a custom d3-force simulation with tuned parameters (charge -200, link distance 100, collision by degree radius, alphaDecay 0.015, link iterations 2)
- [x] 3.2 Add cluster force logic to the simulation: compute organization centroids each tick and nudge members toward centroid at strength 0.04
- [x] 3.3 Update `EntityGraphView.client.vue` to use `createGraphSimulation` in the ForceLayout constructor's `createSimulation` callback (campaign graph only, not character detail radial)

## 4. Focus+Context Interaction

- [x] 4.1 Add reactive `focusedNodeId` and `hoveredNodeId` refs to `EntityGraphView.client.vue`
- [x] 4.2 Wire `node:click` to set `focusedNodeId`, `view:click` to clear it, `node:pointerover`/`node:pointerout` to set/clear `hoveredNodeId`
- [x] 4.3 Compute `activeHighlightSet` (neighbor node IDs + connected edge IDs) from focused or hovered node
- [x] 4.4 Apply opacity in `#override-node` slot: full opacity for highlighted nodes, 0.1 for dimmed (focused mode) or 0.3 for dimmed (hover preview mode). Add CSS `transition: opacity 300ms ease`
- [x] 4.5 Apply edge dimming via `edge.normal.color` callback returning RGBA with alpha 0.1 for non-connected edges when focus/hover is active

## 5. Node Sizing by Degree

- [x] 5.1 Compute `degreeMap` from edges in `EntityGraphView` and pass degree-based radius into `#override-node` slot circle elements
- [x] 5.2 Pass degree-based collision radius to the ForceLayout's `createSimulation` (node radius + 8px padding)

## 6. Edge Color by Relation Type

- [x] 6.1 In campaign graph page (`graph.vue`), map `relationTypeSlug` to color using `RELATION_TYPE_COLORS` palette and pass colored edges to `EntityGraphView`
- [x] 6.2 Create a `GraphLegend` component that renders colored dots + relation type labels for the types present in the current graph
- [x] 6.3 Add `GraphLegend` below the graph in `graph.vue`

## 7. Edge Labels on Demand

- [x] 7.1 Set default `edge.label.fontSize` to 0 in `EntityGraphView` configs
- [x] 7.2 Use `edge.label.fontSize` callback to return 10 for edges connected to the focused/hovered node, 0 otherwise

## 8. Faction Clustering Visuals

- [x] 8.1 Compute convex hulls per organization from node positions using `d3.polygonHull` (or inline equivalent). Add 20px padding via point offsetting
- [x] 8.2 Render hull polygons as SVG `<polygon>` elements in a background layer slot, with semi-transparent fill per organization
- [x] 8.3 Update hull positions reactively as the force simulation runs (recompute on layout changes)

## 9. Hover Tooltip

- [x] 9.1 Create an absolutely-positioned tooltip `<div>` inside the graph container that shows on `node:pointerover` after 200ms delay
- [x] 9.2 Populate tooltip with: entity name, type badge, portrait thumbnail, connection count
- [x] 9.3 Position tooltip using v-network-graph coordinate translation (node position → screen position), clamped to container bounds

## 10. Double-Click Navigation

- [x] 10.1 Add `node:dblclick` event handler that navigates to `/campaigns/{campaignId}/characters/{slug}` for character nodes, `/campaigns/{campaignId}/entities/{slug}` for other types
- [x] 10.2 Ensure single click (focus) does not trigger on double-click (use a short debounce/timer to distinguish)

## 11. i18n

- [x] 11.1 Add i18n keys for graph legend, tooltip labels, and any new UI text in `en.json` and `es.json`

## 12. Tests

### 12a. Unit — graph helper functions

- [x] 12.1 Unit tests for `computeDegreeMap`: empty edges → all zeros, degree counts are symmetric, isolated nodes have degree 0 — in `tests/unit/utils/graph-helpers.test.ts`
- [x] 12.2 Unit tests for `computeNeighborSet`: returns direct neighbors only, excludes the node itself, returns empty set for isolated node
- [x] 12.3 Unit tests for `computeNodeRadius`: degree 0 → 14, degree 1 → ~17, degree 9 → ~23, degree 15 → ~25.6 (formula `14 + 3 * sqrt(degree)`)
- [x] 12.4 Unit tests for `relationTypeColor`: ally/allied_with → #22c55e, enemy → #ef4444, rival → #f97316, mentor → #f59e0b, family:spouse → #ec4899, family:* → #3b82f6, unknown slug → #9ca3af (gray default)

### 12b. Unit — focus+context logic

- [x] 12.5 Unit tests for `activeHighlightSet` computation: given edges and a focused node ID, returns correct set of neighbor node IDs and connected edge IDs; when focusedNodeId is null returns empty set
- [x] 12.6 Unit tests for node opacity logic: highlighted node → opacity 1.0, dimmed node (focus mode) → 0.1, dimmed node (hover mode) → 0.3, no focus/hover → 1.0
- [x] 12.7 Unit tests for edge label fontSize callback: connected edge with active focus/hover → 10, non-connected edge → 0, no active focus/hover → 0

### 12c. Integration — graph API

- [x] 12.8 Integration test: `GET /api/campaigns/{id}/graph` returns `relationTypeSlug` string on each edge object
- [x] 12.9 Integration test: `GET /api/campaigns/{id}/graph` returns `organizations` array (each item has `slug` and `name`) on each node object
- [x] 12.10 Integration test: unauthenticated `GET /api/campaigns/{id}/graph` returns HTTP 401

### 12d. E2E — campaign graph page

- [x] 12.11 E2E test: campaign graph page renders the graph container with nodes and edges visible
- [x] 12.12 E2E test: `GraphLegend` component renders below the graph and shows at least one relation type color entry
- [x] 12.13 E2E test: clicking a node adds a focused state — non-neighbor nodes become visually dimmed (opacity < 1)
- [x] 12.14 E2E test: clicking the graph background after a focused node clears the focus (all nodes return to full opacity)
- [x] 12.15 E2E test: double-clicking a character node navigates to the character detail page (`/campaigns/{id}/characters/{slug}`)

### 12e. E2E — character detail graph

- [x] 12.16 E2E test: character detail graph renders with the character as center node (positioned at origin / center of viewport)
- [x] 12.17 E2E test: hovering a node in the character detail graph shows the tooltip after ~200ms with name and connection count visible
