## Context

The campaign relationship graph currently uses v-network-graph (SVG renderer) for ≤500 nodes and Cytoscape.js as a canvas fallback for larger graphs. Nodes show entity name only on hover; edges are colored by relation type using `RELATION_TYPE_COLORS`. Filter controls use plain HTML checkboxes. The graph page is `app/pages/campaigns/[id]/graph.vue`; the main component is `app/components/EntityGraphView.client.vue`; edge/node config lives in `app/utils/graph-helpers.ts`.

This change adds four visual improvements: card node layout, edge line-style variants, mini-map, and icon chip filters. It also adds a `boardSummary` optional field to the `entities` table, exposed through the graph and entity APIs.

## Goals / Non-Goals

**Goals:**

- Let DMs read the graph at a glance without hovering (card layout, always-visible edge styles)
- Provide spatial navigation for large graphs (mini-map)
- Make the filter bar compact and visually consistent with the rest of the UI (icon chips)
- Give DMs a short-form label optimised for the graph card, separate from the main summary

**Non-Goals:**

- Group containers / draggable clustering boxes (existing convex hull covers this)
- Multiple parallel edges between the same node pair
- Custom user-defined node types
- Mini-map for Cytoscape fallback (Cytoscape has its own navigation; SVG mini-map only)

## Decisions

### 1. Card layout: HTML overlay vs SVG foreignObject

**Decision:** Use v-network-graph's slot-based node override (`#override-node-label` or a custom node slot) which renders as SVG `foreignObject`. This is the path v-network-graph documents for custom node shapes.

**Alternatives considered:**

- Pure SVG `<text>` + `<rect>`: Cannot wrap text reliably across variable-length names without complex measurement logic.
- Absolute-positioned HTML overlay: Requires manual coordinate synchronisation on every pan/zoom tick — brittle.

**Rationale:** `foreignObject` keeps card DOM inside SVG coordinate space, so pan/zoom transforms work automatically. The 160px fixed width and auto-height from CSS handle layout.

### 2. Collision geometry for card nodes

**Decision:** When card layout is active, replace the circular `d3.forceCollide` radius (derived from node degree) with a rectangular collision approximation: `max(160/2, height/2) * 1.1`. This is the standard d3-force approach for non-circular shapes — use the bounding-circle of the rectangle.

**Rationale:** d3-force only supports circular collision natively. The bounding-circle overestimates but prevents overlap reliably without needing a custom force.

### 3. Edge styles: inline config vs SVG `<defs>` markers

**Decision:** Use SVG `<defs>` for arrowhead/diamond/circle markers (defined once in the SVG root), referenced via `marker-end`/`marker-start` attributes on each edge. `stroke-dasharray` is set per-edge in the v-network-graph edge config.

**Alternatives considered:**

- CSS classes: v-network-graph doesn't expose CSS classes directly on SVG `<path>` elements for edges without patching the library.
- Emoji/text labels for direction: Too noisy.

**Rationale:** SVG `<defs>` markers are the canonical SVG approach. v-network-graph's edge config already supports `stroke-dasharray` and marker attributes via the `edges` config object.

### 4. Mini-map: SVG primitives vs external library

**Decision:** Build the mini-map from SVG primitives using v-network-graph's `getViewBox()` and node layout data. No new npm dependency.

**Rationale:** The proposal explicitly rules out new npm packages. v-network-graph exposes `layouts` (node positions) and viewport state via its instance API, which is sufficient to render dots + thin lines + a viewport rectangle.

**Implementation note:** The mini-map is a fixed-position `<svg>` element in the bottom-right corner of the graph container (not inside the v-network-graph SVG). It listens to `@update:layouts` and a viewport-change event to redraw.

### 5. `boardSummary` column: separate column vs JSON metadata

**Decision:** Add a discrete `board_summary TEXT` column to the `entities` table (nullable, max 120 chars enforced at the API layer, not DB constraint).

**Alternatives considered:**

- Store in entity `metadata` JSON: Pollutes the general metadata field; harder to index or query later.
- Reuse `summary`: Would force DMs to keep summaries short for graph use, which conflicts with wiki usage.

**Rationale:** A dedicated column is explicit, queryable, and clean. The 120-char limit is a soft constraint validated server-side, not a DB-level constraint, to match the existing pattern for `summary`.

### 6. Filter chips: replace or layer on existing filter logic

**Decision:** Replace only the checkbox rendering in `graph.vue`; keep the existing reactive `typeFilter` state shape. The chip buttons toggle the same Set/array that checkboxes previously toggled.

**Rationale:** Minimises change surface. The filter logic itself is correct; only the UI affordance changes.

## Risks / Trade-offs

- **`foreignObject` browser support**: All modern browsers support SVG `foreignObject`. IE11 is not a target.
- **Card layout performance**: Rendering 200+ `foreignObject` cards is heavier than SVG circles. Mitigated by disabling card layout in Cytoscape mode (>500 nodes) and noting in the spec that card layout is SVG-only.
- **Bounding-circle collision overestimates**: Cards may have slightly more spacing than strictly necessary. Acceptable visual trade-off for zero custom-force complexity.
- **Mini-map synchronisation lag**: If v-network-graph doesn't emit a viewport event synchronously on pan/zoom end, the mini-map rectangle may lag by one frame. Mitigation: use `requestAnimationFrame` in the update handler.
- **`boardSummary` migration**: Additive nullable column — no data migration needed, zero downtime.

## Migration Plan

1. Add Drizzle migration: `ALTER TABLE entities ADD COLUMN board_summary TEXT` (nullable, no default).
2. Deploy server changes (new column, API exposure) before or with frontend changes — frontend gracefully handles `boardSummary: null`.
3. No rollback risk: column is additive and nullable; removing it later requires only a migration.

## Open Questions

- Should card layout be the default for new campaigns, or always start in compact mode? (Current decision: always compact; toggle is opt-in per campaign via localStorage.)
- Should the mini-map show edge lines or only node dots? (Current decision: thin edge lines included for spatial context, but at 1px stroke, no color.)
