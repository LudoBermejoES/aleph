## 1. Graph Data Computation

- [x] 1.1 In `app/pages/campaigns/[id]/characters/[slug]/index.vue`, add a `computeAttitudeColor(score)` inline helper (pure function: gray for 0/null, red gradient for negative, green gradient for positive — mirrors `server/services/relationships.ts`)
- [x] 1.2 Add a `graphData` computed property that builds `{ nodes, edges }` from `character`, `relations`, and `connections` refs:
  - Center node: `character.entityId` → `{ name: character.name, type: 'character' }`
  - For each item in `relations`: add a node for `relatedEntityId` using `relatedEntityName`/`relatedEntityType`; add an edge keyed by `rel.id` with `source: sourceEntityId`, `target: targetEntityId`, `label: rel.label`, `color: computeAttitudeColor(rel.attitude)`
  - For each item in `connections`: add a node for `targetEntityId` using `targetEntityName`/`targetEntityType ?? 'character'`; add an edge keyed by `conn.id` with `source: character.entityId`, `target: conn.targetEntityId`, `label: conn.label ?? ''`, `color: '#9ca3af'`
  - Returns `null` when both `relations` and `connections` are empty
- [x] 1.3 Add a `nodeSlugMap` computed property: maps each entity UUID in the graph to `{ slug, type }` — built from `relations` (using `relatedEntityId`→`relatedEntitySlug`/`relatedEntityType`) and `connections` (using `targetEntityId`→`targetEntitySlug`/`targetEntityType`); include the current character as `character.entityId`→`{ slug: character.slug, type: 'character' }`

## 2. Node Click Navigation

- [x] 2.1 Add `onGraphNodeClick(nodeId: string)` function: looks up `nodeSlugMap[nodeId]`; if type is `character` navigates to `/campaigns/${campaignId}/characters/${slug}`; otherwise navigates to `/campaigns/${campaignId}/entities/${slug}`; if slug not found, navigates to the campaign graph page as fallback

## 3. Template — Graph Section

- [x] 3.1 Import `EntityGraphView` (client-only component — already registered globally or import explicitly if needed)
- [x] 3.2 Add a graph section in the template between the Relations section and the Companions section

## 4. Node Portrait Images

- [x] 4.1 Extend the `nodes` prop type in `EntityGraphView.client.vue` to accept an optional `image` field: `{ name: string; type: string; image?: string }` — a URL string (or null/undefined for no image)
- [x] 4.2 In `EntityGraphView.client.vue`, use the `override-node` slot on `<v-network-graph>` to render a custom SVG node with circular portrait image or colored circle fallback
- [x] 4.3 In the character page `graphData` computed, extend each node entry to include `image` from `charPortraitMap`
- [x] 4.4 Store `allChars` ref in `load()` and derive `charPortraitMap` computed from it

## 5. i18n Keys

- [x] 5.1 Add `"graph": "Relationship Graph"` to the `characters` section in `i18n/locales/en.json`
- [x] 5.2 Add `"graph": "Grafo de Relaciones"` to the `characters` section in `i18n/locales/es.json`
