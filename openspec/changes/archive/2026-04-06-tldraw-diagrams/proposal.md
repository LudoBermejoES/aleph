## Why

Aleph currently offers a relationship graph view for visualizing entity connections, but has no general-purpose diagramming capability. Game Masters frequently need to sketch dungeon layouts, plot flowcharts, faction relationship webs, session planning boards, and encounter maps. These are created outside Aleph (pen-and-paper, Miro, draw.io) and either lost or not linked to campaign data. Embedding an interactive diagramming canvas directly inside campaigns — with the ability to auto-generate diagrams from existing campaign data — closes this gap and makes Aleph a one-stop campaign workspace.

tldraw is an infinite canvas SDK with a full programmatic API, custom shape support, and an official Vue integration template. It can render editable shapes from data (including Mermaid conversion via `@tldraw/mermaid`), making it suitable for both manual whiteboarding and auto-generated diagrams.

## What Changes

1. **Diagram canvas page** (new) — Per-campaign page at `/campaigns/:id/diagrams/:diagramId` embedding a tldraw canvas in a Vue wrapper. Users can draw freehand, place shapes, connect them with arrows, and create text labels.

2. **Diagram list and management** (new) — Page at `/campaigns/:id/diagrams` listing all diagrams in a campaign. Create, rename, duplicate, and delete diagrams.

3. **Diagram persistence** (new) — New `diagrams` table storing diagram metadata (id, campaignId, title, createdBy, createdAt, updatedAt) and `diagram_snapshots` table storing the tldraw store snapshot JSON. Server API for CRUD + snapshot save/load.

4. **Auto-generate diagrams** (new) — Server-side endpoint that reads campaign entities, characters, locations, organizations, quests, or session data and produces a tldraw-compatible shape array. Supports generation modes: entity relationship web, quest dependency tree, faction hierarchy, location map, session timeline. Uses the tldraw programmatic API to lay out shapes.

5. **Custom tldraw shapes** (new) — Domain-specific shapes for TTRPG concepts: entity card (with portrait, type icon, and name), quest node (with status color), location pin, NPC token. These render richer than generic rectangles and link back to their source entity.

6. **Entity panel** (new) — Collapsible sidebar on the diagram editor page. Contains a search box that queries all campaign entity types (characters, locations, organizations, items, quests, wiki entities). Results show portrait/icon and name. Entities are dragged onto the canvas to place them as custom shapes. Entities already present on the canvas show a badge indicator. Panel is read-only for players/visitors.

7. **Vue/React bridge component** (new) — Reusable Vue component (`TldrawCanvas.vue`) that mounts tldraw's React component using `createRoot`, handles lifecycle, passes props for initial snapshot and persistence callbacks.

8. **CLI diagram commands** (new) — `aleph diagram list/create/delete --campaign <id>` and `aleph diagram generate --campaign <id> --type <type>` for generating diagrams from data.

## Capabilities

### New Capabilities

- `diagram-canvas`: Interactive tldraw-based infinite canvas for manual and assisted diagramming within campaigns.
- `diagram-persistence`: Server-side storage and API for diagram metadata and tldraw snapshots.
- `diagram-generation`: Auto-generate diagrams from campaign data (entity graphs, quest trees, faction webs, session timelines).
- `diagram-custom-shapes`: Domain-specific tldraw shape types for TTRPG entities, quests, locations, and NPCs.
- `diagram-entity-panel`: Collapsible sidebar for searching and dragging any campaign entity onto the canvas.

### Modified Capabilities

- `aleph-cli`: New `diagram` command group for listing, creating, deleting, and generating diagrams.

## Impact

- **New dependencies**: `react`, `react-dom`, `tldraw` (includes `@tldraw/editor`, `@tldraw/store`, `@tldraw/tlschema`), `@tldraw/mermaid` (lazy-loaded for diagram generation)
- **New DB tables**: `diagrams`, `diagram_snapshots` in `server/db/schema/`
- **New API routes**: `server/api/campaigns/[id]/diagrams/` (CRUD, snapshot, generate)
- **New pages**: `app/pages/campaigns/[id]/diagrams/index.vue`, `app/pages/campaigns/[id]/diagrams/[diagramId].vue`
- **New components**: `app/components/diagrams/TldrawCanvas.vue` (Vue-React bridge), `app/components/diagrams/DiagramList.vue`, `app/components/diagrams/EntityPanel.vue` (collapsible sidebar with search)
- **New server utils**: `server/utils/diagram-generator.ts` (entity-to-shape conversion, layout algorithms)
- **CLI**: `cli/src/commands/diagram.js` — new command file
- **i18n**: New keys for diagram labels, generation modes, error messages
- **Build config**: `nuxt.config.ts` — Vite plugin for React (`@vitejs/plugin-react`) alongside Vue, or `vite-plugin-react` aliased to avoid conflicts
- **License note**: tldraw requires a commercial license for production use — this must be obtained before deployment
- **Bundle size**: React + tldraw adds ~1-2MB to client bundle; should be code-split so it only loads on diagram pages
