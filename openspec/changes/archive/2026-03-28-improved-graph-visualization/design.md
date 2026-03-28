## Context

The relationship graph is rendered by `EntityGraphView.client.vue` using v-network-graph (Vue 3 SVG library) with `ForceLayout` from `v-network-graph/lib/force-layout` (wraps d3-force). The component already supports:
- Per-node portrait images via `#override-node` SVG slot
- Per-edge color via callback configs
- Radial layout when `centerNodeId` is set (character detail page)
- ForceLayout when no center node (campaign graph page)
- Type-based node coloring (character=blue, location=green, etc.)

The graph API at `GET /api/campaigns/[id]/graph` returns `{ nodes, edges }` with node name/type/image and edge source/target/label/color/attitude. It does NOT currently include relation type slugs or organization membership.

The campaign currently has 11 characters and 40+ relations. Graph is already hard to read.

## Goals / Non-Goals

**Goals:**
- Make graphs with 20-100 nodes usable and legible
- Focus+context interaction (click/hover to highlight neighborhood)
- Visual clustering by faction/organization
- Degree-based node sizing for visual hierarchy
- Color-coded edges by relation type with legend
- Edge labels visible only on demand (hover/focus)
- Hover tooltip with entity details

**Non-Goals:**
- Canvas/WebGL rendering (SVG is fine for <500 nodes)
- Edge bundling (overkill for this scale)
- Fisheye distortion (disorienting, research shows it's slower for topology tasks)
- Session timeline / temporal filtering (future change)
- Minimap (unnecessary at this scale)
- Depth slider / multi-hop filtering (future enhancement)
- Graph layout persistence / saved positions (future enhancement)

## Decisions

### 1. Focus+Context via reactive state + SVG opacity

**Decision**: Maintain a `focusedNodeId` ref in `EntityGraphView`. When set, compute the neighbor set from edges. In the `#override-node` slot, apply `opacity: 0.1` to non-neighbor nodes and `opacity: 0.1` to non-connected edges via SVG attributes. Use CSS `transition: opacity 300ms ease` for smooth fading.

**Why not v-network-graph config callbacks for opacity?** The config system doesn't expose an `opacity` field. We already use the `#override-node` slot for portraits, so applying opacity there is natural. For edges, we'll use the `edge.normal.color` callback returning an RGBA color with alpha for dimmed edges.

**Alternatives considered:**
- Hiding non-neighbor nodes entirely: Loses context about graph structure.
- Using CSS classes: v-network-graph SVG elements don't expose stable class names.

### 2. Custom ForceLayout simulation via createSimulation callback

**Decision**: Pass a `createSimulation` function to `ForceLayout` constructor with tuned parameters:
- `d3.forceManyBody().strength(-200).distanceMax(400)` — repulsion prevents overlap
- `d3.forceLink(edges).id(d => d.id).distance(100).iterations(2)` — stiffer links
- `d3.forceCollide().radius(d => nodeRadius(d) + 8).iterations(2)` — collision based on degree-sized radius
- `d3.forceCenter().strength(0.05)` — gentle centering
- Custom cluster force per tick: nudge nodes toward their organization centroid at strength 0.04
- `alphaDecay(0.015)` — longer settling time for better layout (~450 ticks)

**Why custom over defaults?** The default ForceLayout uses charge -30 and link distance 30, which produces a very tight cluster. With 40+ edges, nodes overlap badly.

### 3. Node sizing by degree via computed radius map

**Decision**: Pre-compute a `degreeMap: Record<nodeId, number>` from the edges data. Pass it into the ForceLayout's collision radius and into the `#override-node` slot for the circle radius. Formula: `radius = 14 + 3 * Math.sqrt(degree)`. Range: 14px (isolated) to ~26px (degree 15).

**Why sqrt?** Linear scaling makes hub nodes absurdly large. Sqrt provides visual differentiation without dominating the viewport.

### 4. Edge color by relation type slug

**Decision**: Extend the graph API to include `relationTypeSlug` per edge. Map slugs to a categorical palette:
| Slug | Color | Hex |
|------|-------|-----|
| ally | Green | #22c55e |
| enemy | Red | #ef4444 |
| rival | Orange | #f97316 |
| mentor | Amber | #f59e0b |
| family:* | Blue | #3b82f6 |
| romantic/spouse | Pink | #ec4899 |
| custom | Gray | #9ca3af |

Override the current `computeAttitudeColor` approach for the campaign-wide graph. The character detail page keeps attitude-based coloring (it shows one character's perspective).

Add a color legend component below the graph.

### 5. Edge labels: hidden by default, shown on hover/focus

**Decision**: Set `edge.label.fontSize: 0` in the default config. When a node is focused or hovered, dynamically set `edge.label.fontSize` to 10 for connected edges only (via the callback pattern — the label config accepts per-edge callbacks).

**Alternative considered:** Always show labels but use collision avoidance. Too complex and still unreadable at 40+ edges.

### 6. Faction clustering via custom tick force + convex hull SVG layer

**Decision**: The graph API will include `organizations: string[]` per node (slugs of orgs the entity belongs to). In the ForceLayout's `createSimulation`, add a custom force that each tick computes group centroids and nudges members toward their centroid at strength 0.04.

For visual grouping, use v-network-graph's layer system: add a `<template #override-group>` or use the base SVG layer to draw convex hulls (via `d3.polygonHull`) around each organization's nodes, with semi-transparent fill (HSL, saturation 25%, alpha 0.15) and 20px padding.

**Why not v-network-graph `paths`?** Paths trace edges, not arbitrary node groups. Convex hulls drawn in a background SVG layer give more control.

### 7. Hover tooltip via floating div positioned from SVG coordinates

**Decision**: On `node:pointerover`, show a small floating `<div>` (not SVG — easier to style with Tailwind) positioned absolutely above the hovered node. Content: portrait thumbnail, name, type badge, connection count. Use `v-network-graph`'s coordinate translation APIs to convert node position to screen coordinates.

### 8. API extension: add relationTypeSlug and organizations to graph response

**Decision**: In `GET /api/campaigns/[id]/graph`, join `entityRelations` with `relationTypes` to include `relationTypeSlug` per edge. Join `entities` with `organizationMembers` + `organizations` to include `organizations: string[]` per node.

This is a backward-compatible addition — existing consumers ignore unknown fields.

## Risks / Trade-offs

- **[Performance with convex hulls on every tick]** → Mitigation: Only recompute hulls when the simulation produces new positions (debounce to animation frames). For <100 nodes, this is negligible.
- **[ForceLayout fights with radial layout on character pages]** → Mitigation: Only use ForceLayout on the campaign graph page. Character pages keep the existing radial layout (no ForceLayout, no clustering).
- **[Edge color by type conflicts with edge color by attitude]** → Mitigation: Campaign graph uses type-based coloring (categorical). Character detail graph keeps attitude-based coloring (gradient). Different contexts, different needs.
- **[SVG opacity transitions may lag with many nodes]** → Mitigation: Use `will-change: opacity` on the parent `<g>` elements. At <100 nodes, SVG transitions are well within performance budget (<1ms per frame).
- **[Tooltip positioning edge cases]** → Mitigation: Clamp tooltip to viewport bounds. Use a small fixed-size tooltip to minimize overflow issues.
