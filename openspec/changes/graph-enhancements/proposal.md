## Why

The campaign relationship graph is one of the most powerful tools in Aleph for understanding how entities connect, but it relies entirely on hover interactions to reveal any information — names, types, and relationship labels are hidden until the user mouses over nodes. For DMs managing large campaigns this makes the graph hard to read at a glance. Competing tools like Alkemion Studio demonstrate that small visual improvements (card nodes, edge style variants, a mini-map, better filters) dramatically reduce the cognitive load of navigating a complex relationship web.

## What Changes

- **Node card layout**: Add a toggleable "card" display mode where nodes show entity name, type badge, and a short summary directly on the node (no hover required). A new optional `board_summary` field on entities lets DMs write a board-optimised label separate from the main summary.
- **Edge style variants**: Apply distinct line styles (solid/dashed/dotted) and directional marker shapes to edges based on relation type category, adding a second visual channel beyond colour.
- **Mini-map**: Show a thumbnail overview of the full graph with a viewport indicator for graphs with 30+ nodes, with click-to-pan navigation.
- **Icon chip type filters**: Replace plain checkboxes in the type filter bar with icon chip buttons matching the app's icon system, plus a "Connected only" toggle to hide isolated nodes.

## Capabilities

### New Capabilities

- `graph-enhancements`: All four improvements to the campaign relationship graph — card node layout, edge style variants, mini-map, icon chip filters, and the `boardSummary` entity field.

### Modified Capabilities

- `graph-layout`: Edge style variants (dasharray + markers) extend the existing edge colour spec; node card layout requires updated collision geometry in the force simulation.
- `graph-interaction`: Mini-map interaction (click-to-pan) and card layout toggle are new interactions layered on the existing focus/hover/navigate spec.
- `relationship-graph`: The `boardSummary` field and its inclusion in the graph API response extend the existing node data contract.

## Impact

**Server:**

- `server/db/schema/entities.ts` — add `boardSummary` column (nullable text, max 120 chars)
- `server/db/migrations/` — new migration for the column
- `server/api/campaigns/[id]/graph/index.get.ts` — include `boardSummary` in node response
- `server/api/campaigns/[id]/entities/[slug].get.ts` and `.put.ts` — expose/accept `boardSummary`

**Frontend:**

- `app/components/EntityGraphView.client.vue` — card layout mode, edge style config, mini-map component
- `app/utils/graph-helpers.ts` — edge style mapping function, card collision geometry
- `app/components/GraphLegend.vue` — line style samples in legend entries
- `app/pages/campaigns/[id]/graph.vue` — card/compact toggle, icon chip filters, "connected only" toggle
- `app/pages/campaigns/[id]/entities/[slug].vue` — `boardSummary` field in entity edit form

**Dependencies:** No new npm packages required — mini-map can be built from SVG primitives using v-network-graph's existing viewport/zoom API; edge markers use SVG `<defs>` already available in the SVG renderer.

**CLI:** `boardSummary` is a new optional entity field. The `aleph entity update` command should accept `--board-summary` flag. `aleph entity show` output should include it when set.

**Tests:** Unit tests for edge style mapping; integration tests for `boardSummary` in graph API; E2E tests for card toggle and chip filters.
