## Context

The entity detail page already has a working relationship graph via `EntityGraphView.client.vue` (v-network-graph). The character page loads two separate data sets that together represent the character's full relationship web:

- `relations` ref — `EntityRelation[]` enriched with `relatedEntityName`, `relatedEntitySlug`, `relatedEntityType`; each item has `relatedEntityId`, `label` (perspective-resolved), `attitude`, `sourceEntityId`, `targetEntityId`
- `connections` ref — `CharacterConnection[]` enriched with `targetEntityName`, `targetEntitySlug`, `targetEntityType`; each item has `targetEntityId`, `label`, `description`

`EntityGraphView` expects:
```ts
nodes: Record<string, { name: string; type: string }>
edges: Record<string, { source: string; target: string; label: string; color: string; attitude?: number }>
```

Node IDs are entity UUIDs. Edge IDs are relation/connection UUIDs.

## Goals / Non-Goals

**Goals:**
- Derive `graphData` from the already-loaded `relations` and `connections` refs — zero extra API calls
- Combine both data sources into a single graph: center node + relation edges (attitude-colored) + connection edges (gray, directed)
- Navigate to correct page on node click using slug + type already in the data
- Show graph only when there is at least one relation or connection

**Non-Goals:**
- Showing a full campaign graph (separate page already exists)
- Filtering or expanding the graph beyond the character's direct links
- Editing relations from the graph

## Decisions

**Graph data as a `computed`**: `graphData` is derived from `character`, `relations`, and `connections` refs — no async work needed. Using `computed` keeps it reactive if relations are added without reload.

**Attitude color**: The `computeAttitudeColor` function lives in `server/services/relationships.ts` (server-only path). Rather than importing it on the client, inline an equivalent pure function in the page script. It's a simple 10-line color lerp — no dependency needed.

**Edge direction for connections**: Character connections are directional (character → entity). `EntityGraphView` renders all edges as undirected by default in v-network-graph. To signal directionality visually, the label already carries the verb ("rival", "ancla emocional"). This is sufficient — no arrow config changes needed.

**Node for current character**: Always included as `character.entityId` with `type: 'character'`. If `relatedEntityType` is missing for a node, default to `'character'` since all current relations are between characters.

**Node click navigation**: The `relations` and `connections` refs already carry `relatedEntitySlug`/`targetEntitySlug` and `relatedEntityType`/`targetEntityType`. Build a `nodeSlugMap` (entityId → {slug, type}) at graph build time; use it in `onGraphNodeClick`.

**Graph height**: 350px — same as entity page.

**Placement**: Between the Relations section and the Companions section, so the graph appears after the text lists it summarizes.

## Risks / Trade-offs

- If a character has many relations (10+) the graph may look crowded — acceptable for now; the full campaign graph is available for the big picture.
- `computeAttitudeColor` inlined in the page means two copies. If the function changes, both must be updated. Low risk — it's a stable pure function.
