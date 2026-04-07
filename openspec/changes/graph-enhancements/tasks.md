## 1. Database — boardSummary column

- [ ] 1.1 Add `boardSummary` nullable text column to `server/db/schema/entities.ts`
- [ ] 1.2 Generate Drizzle migration for `board_summary` column

## 2. Server API — boardSummary exposure

- [ ] 2.1 Include `boardSummary` in `GET /api/campaigns/[id]/graph` node response (`server/api/campaigns/[id]/graph/index.get.ts`)
- [ ] 2.2 Expose `boardSummary` in `GET /api/campaigns/[id]/entities/[slug]` response
- [ ] 2.3 Accept and validate `boardSummary` (max 120 chars, 422 if exceeded) in `PUT /api/campaigns/[id]/entities/[slug]`

## 3. Edge style variants

- [ ] 3.1 Add `getEdgeStyle(slug)` pure function to `app/utils/graph-helpers.ts` returning `{ color, dasharray, markerStart, markerEnd }`
- [ ] 3.2 Add SVG `<defs>` markers (arrow, circle, diamond) to `EntityGraphView.client.vue`
- [ ] 3.3 Apply `getEdgeStyle` in `EntityGraphView.client.vue` edge config (set `stroke-dasharray` and marker attributes per edge)
- [ ] 3.4 Update `GraphLegend.vue` to show line-style sample (solid/dashed/dotted) next to each relation type entry

## 4. Card node layout

- [ ] 4.1 Add card node slot / foreignObject template in `EntityGraphView.client.vue` (160px wide, name + type badge + summary)
- [ ] 4.2 Wire `boardSummary` → `summary` fallback logic in card template
- [ ] 4.3 Add bounding-circle collision geometry for card mode in `app/utils/graph-helpers.ts`
- [ ] 4.4 Add card/compact toggle button to `app/pages/campaigns/[id]/graph.vue` toolbar, persisted in `localStorage`
- [ ] 4.5 Disable card layout toggle with tooltip when in Cytoscape mode (>500 nodes)

## 5. Mini-map

- [ ] 5.1 Build `GraphMiniMap.vue` component: fixed-position SVG panel with node dots, edge lines, viewport rectangle
- [ ] 5.2 Wire mini-map to v-network-graph layouts and viewport state; update rectangle on pan/zoom via `requestAnimationFrame`
- [ ] 5.3 Implement click-to-pan: translate mini-map click coordinates to world-space and call v-network-graph pan API
- [ ] 5.4 Add collapse/expand chevron to mini-map panel; persist collapsed state in `localStorage`
- [ ] 5.5 Show mini-map only when visible node count ≥ 30; hide with no reserved space when < 30

## 6. Icon chip type filters

- [ ] 6.1 Replace checkbox filter controls in `app/pages/campaigns/[id]/graph.vue` with icon chip buttons using `ICONS` from `app/utils/icons.ts`
- [ ] 6.2 Add "All" chip that restores all entity types to visible
- [ ] 6.3 Add "Connected only" toggle; filter out zero-edge nodes and show hidden-count badge
- [ ] 6.4 Persist chip filter state and "connected only" toggle in `localStorage` per campaign

## 7. Entity edit form — boardSummary field

- [ ] 7.1 Add "Graph label" text input (max 120 chars) to entity edit form in `app/pages/campaigns/[id]/entities/[slug].vue`, positioned under the Summary field

## 8. CLI — boardSummary support

- [ ] 8.1 Add `--board-summary` flag to `aleph entity update` command in `cli/src/commands/campaign.js`
- [ ] 8.2 Include `boardSummary` in `aleph entity show` output when set
- [ ] 8.3 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to document `--board-summary`

## 9. Tests

- [ ] 9.1 Unit tests for `getEdgeStyle` in `tests/unit/server/` (all slug patterns, default fallback)
- [ ] 9.2 Integration tests for `boardSummary` in graph API response (`tests/integration/`)
- [ ] 9.3 Integration tests for `boardSummary` accept/reject on entity PUT (valid, >120 chars, null)
- [ ] 9.4 E2E test: card layout toggle persists across navigation (`tests/e2e/`)
- [ ] 9.5 E2E test: icon chip filter hides/shows nodes and persists state
