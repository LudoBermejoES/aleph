## Why

The current relationship graph (both campaign-wide and character-centered) renders all nodes and edges at full opacity with no interactive filtering. With 11+ characters and 40+ relations in a single campaign, the graph is already unreadable — edges overlap, labels collide, and there's no way to focus on one character's neighborhood. As more entities and relations are added, usability will degrade further. The graph needs focus+context interaction, better layout tuning, and visual hierarchy to be useful for campaigns with dozens of characters.

## What Changes

- **Focus+Context interaction**: Clicking a node dims all unrelated nodes and edges to ~10% opacity, highlighting only the selected node, its direct neighbors, and their connecting edges. Clicking the background resets. Hovering a node previews the highlight.
- **Custom ForceLayout tuning**: Replace the default d3-force parameters with tuned values (charge -200, link distance 100, collision radius scaled by node degree, alphaDecay 0.015) for better spread with 20-100 nodes.
- **Node sizing by degree**: Nodes with more connections appear larger (`radius = base + scale * sqrt(degree)`), making hub characters visually prominent.
- **Edge color by relation type**: Map relation type slugs to a categorical color palette (green=ally, red=enemy, blue=family, pink=romantic, amber=mentor, gray=custom). Show a legend.
- **Edge labels on hover only**: Hide edge labels by default to reduce clutter. Show labels only for edges connected to the hovered/focused node.
- **Faction/organization clustering**: Add a soft cluster force pulling members of the same organization toward a shared centroid, plus semi-transparent convex hull backgrounds to visually group faction members.
- **Hover tooltip**: Show a tooltip on node hover with character name, portrait, type, and connection count.

## Capabilities

### New Capabilities
- `graph-interaction`: Focus+context highlighting, hover tooltips, edge label visibility, and node click/hover behaviors for the relationship graph.
- `graph-layout`: Custom ForceLayout simulation tuning, node sizing by degree, faction clustering with convex hulls, and edge color coding by relation type.

### Modified Capabilities
- `relationship-graph`: The existing spec's "Interactive Relationship Graph View" requirement is being enhanced with focus+context interaction, dynamic opacity, clustering, and degree-based sizing — all of which are new behavioral requirements beyond the current spec.

## Impact

- **`app/components/EntityGraphView.client.vue`**: Major rework — reactive focus state, per-node/per-edge opacity via `#override-node` slot, custom ForceLayout simulation, degree-based sizing, cluster force, hull rendering, tooltip component, legend component.
- **`app/pages/campaigns/[id]/graph.vue`**: Pass organization membership data to graph component for clustering; add legend UI.
- **`app/pages/campaigns/[id]/characters/[slug]/index.vue`**: Pass organization data for clustering on character detail graph.
- **`server/api/campaigns/[id]/graph/index.get.ts`**: Extend response to include relation type slug per edge and organization membership per node (for clustering).
- **Dependencies**: `d3-force` (already installed). No new dependencies needed — v-network-graph's ForceLayout + custom SVG slots provide everything.
- **CLI**: No CLI impact. This change is purely frontend visualization + a small API response extension.
- **Tests**: Unit tests for degree calculation, color mapping, focus/neighbor computation. E2E tests for graph interaction (click-to-focus, hover tooltip).
