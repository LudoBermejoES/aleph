## Context

Aleph has a relationship graph view (vis-network based) for entity connections, but no general-purpose diagramming. GMs need to sketch dungeon layouts, plot flowcharts, faction webs, and encounter maps. tldraw is a React-based infinite canvas SDK with a programmatic API, custom shapes, Mermaid import, and an official Vue integration pattern. Aleph's stack is Nuxt 4 (Vue 3 + Nitro + SQLite/Drizzle).

The main integration challenge is that tldraw is React-only. The approach is to mount React inside Vue using `createRoot`, following tldraw's official Vue template.

## Goals / Non-Goals

**Goals:**

- Embed an interactive infinite canvas in campaign pages for freehand drawing and structured diagramming
- Persist diagram state (tldraw snapshots) server-side per campaign
- Auto-generate diagrams from existing campaign data (entities, quests, factions, locations)
- Provide domain-specific custom shapes that link to campaign entities
- Allow GMs to search and drag any campaign entity (characters, locations, organizations, items, quests, wiki entries) onto the canvas from a collapsible sidebar
- Keep tldraw code-split so it only loads on diagram pages (no bundle impact elsewhere)
- Support all campaign roles appropriately (DM/editor can edit, player/visitor can view)

**Non-Goals:**

- Real-time collaborative editing on diagrams (v1 is single-user-at-a-time; collaboration can be added later via @tldraw/sync or Hocuspocus bridge)
- Image/map tile overlay on the canvas (the existing maps feature handles that)
- Replacing the relationship graph view — diagrams complement it, not replace it
- Mobile-optimized canvas editing (tldraw works on mobile but we won't optimize the UX for it in v1)
- AI-assisted diagram generation (AI summarization is separate; diagram generation is data-driven, not LLM-driven)

## Decisions

**Decision 1: Vue-React bridge via createRoot**

Mount tldraw's React component into a Vue component using React DOM's `createRoot`. The Vue component (`TldrawCanvas.vue`) owns a `<div ref>`, creates a React root on mount, renders `<Tldraw />` into it, and unmounts on Vue's `onUnmounted`. Props (initial snapshot, read-only mode, persistence callback) are passed via a React wrapper component that reads them from a shared reactive store or closure.

Alternative considered: Using an iframe to isolate React entirely. Rejected — too much complexity for communication, no shared auth context, and poor DX.

Alternative considered: Web Component wrapper. Rejected — tldraw's CSS and portals don't work well in Shadow DOM.

**Decision 2: Vite dual-framework support**

Add `@vitejs/plugin-react` to `nuxt.config.ts` Vite plugins. This enables JSX/TSX compilation for React components alongside Vue's SFC compiler. The React components live in `app/components/diagrams/react/` with `.tsx` extensions. Vue components import and mount them.

Risk: Plugin conflicts between `@vitejs/plugin-vue` and `@vitejs/plugin-react`. Mitigation: `@vitejs/plugin-react` only processes `.tsx`/`.jsx` files; Vue plugin only processes `.vue` files. Include/exclude patterns prevent overlap.

**Decision 3: Snapshot-based persistence (not CRDT)**

Store diagram state as a JSON snapshot of the tldraw store. On save, call `editor.store.getStoreSnapshot()` and POST to the server. On load, fetch the snapshot and pass it to `<Tldraw snapshot={...} />`. Auto-save on a 5-second debounce after changes, plus explicit save button.

This is simpler than CRDT-based sync and sufficient for v1 (single editor). The snapshot includes all shapes, pages, bindings, and assets. Schema migrations are handled by tldraw's built-in migration system.

Alternative considered: Storing individual shape records and syncing deltas. Rejected — over-engineered for v1 without collaboration.

**Decision 4: Database schema**

Two tables:

```sql
diagrams (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL REFERENCES campaigns(id),
  title TEXT NOT NULL,
  description TEXT,
  diagramType TEXT DEFAULT 'freeform',  -- freeform, entity-graph, quest-tree, faction-web, etc.
  createdBy TEXT NOT NULL REFERENCES user(id),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
)

diagram_snapshots (
  id TEXT PRIMARY KEY,
  diagramId TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  snapshot TEXT NOT NULL,  -- JSON blob of tldraw store snapshot
  version INTEGER NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL
)
```

Only the latest snapshot is used for loading. Old snapshots serve as version history (optional, can be pruned). The `snapshot` column stores the full tldraw JSON — typically 10KB-500KB depending on diagram complexity.

**Decision 5: Auto-generation architecture**

Diagram generation runs server-side in `server/utils/diagram-generator.ts`. It queries campaign data (entities, relationships, quests, etc.), builds a shape array using tldraw's schema types, applies a layout algorithm, and returns the shapes as a tldraw snapshot.

Layout algorithms:
- **Entity graph**: Force-directed layout (reuse existing graph logic or simple spring model)
- **Quest tree**: Top-down tree layout (parent quest → sub-quests)
- **Faction web**: Radial layout (central faction, members radiating outward)
- **Session timeline**: Left-to-right chronological layout

The generated snapshot is saved as a new diagram. Users can then edit it freely — the auto-generation is a starting point, not a live binding.

**Decision 6: Custom shapes via ShapeUtil**

Four domain-specific tldraw shapes:

- **EntityCard**: Displays entity name, type icon, and optional portrait thumbnail. Links to `/campaigns/:id/entities/:slug`. Rendered as a rounded rectangle with header.
- **QuestNode**: Shows quest title + status (color-coded: active=blue, completed=green, failed=red). Links to quest detail page.
- **LocationPin**: Map-pin style shape with location name. Compact, suitable for spatial arrangements.
- **NPCToken**: Circular token with character name and portrait. For encounter/scene planning.

Each shape stores an `entityId` and `campaignId` in its props. Double-clicking opens the linked entity in a new tab. Shapes are registered via tldraw's `shapeUtils` prop.

**Decision 7: Entity panel — collapsible sidebar with drag-and-drop**

The diagram editor page includes a collapsible sidebar (`EntityPanel.vue`) on the left. It is a pure Vue component (not inside React/tldraw) rendered alongside the canvas.

Layout:
```
┌──────────────┬──────────────────────────────────┐
│ 🔍 Search    │                                  │
│──────────────│         tldraw Canvas            │
│ Characters   │                                  │
│ [img] Aria ①│                                  │
│ [img] Thor   │                                  │
│ Locations    │                                  │
│ [img] City   │                                  │
└──────────────┴──────────────────────────────────┘
```

**Search**: A single debounced text input queries the existing `/api/campaigns/:id/search` endpoint (or a new unified entity search endpoint if needed). Results are grouped by type: Characters, Locations, Organizations, Items, Quests, Entities. Each result shows the portrait thumbnail (or a type icon placeholder) and the entity name.

**Drag interaction**: Each entity card in the panel has `draggable="true"`. The `dragstart` event stores the entity data (id, type, name, portraitUrl, slug) in `event.dataTransfer`. The tldraw canvas wrapper listens for `drop` events on its container div, converts the drop coordinates to canvas space using tldraw's `editor.screenToPage(x, y)`, then creates the appropriate custom shape at that position.

Coordinate conversion:
```typescript
const pagePoint = editor.screenToPage({ x: dropEvent.clientX, y: dropEvent.clientY })
editor.createShape({ type: 'entityCard', x: pagePoint.x, y: pagePoint.y, props: { ...entityData } })
```

**Badge indicator**: When the canvas snapshot changes, the panel reads the current shapes from `editor.getCurrentPageShapes()`, extracts all `entityId` props, and builds a Set of placed entity IDs. Entity cards in the panel that appear in this set show a small badge (count if placed multiple times). This is computed reactively on every canvas change.

**Collapse**: A toggle button (chevron) collapses the sidebar. State is stored in a `ref` and persisted to `localStorage` so it survives page reloads. In collapsed state, the sidebar shows only the toggle button; the canvas takes full width.

**Role restriction**: The panel is hidden entirely for players/visitors (read-only canvas mode has no need for it).

**Decision 7: Role-based access**

- DM, co_dm, editor: Full edit access (create diagrams, draw, save)
- Player: View-only access to diagrams (canvas renders in read-only mode)
- Visitor: View-only if diagram visibility allows

The generate endpoint requires editor+ role. The canvas component accepts a `readOnly` prop that disables all tools.

**Decision 8: Code splitting**

React + tldraw should NOT be included in the main bundle. The diagram pages use `defineAsyncComponent` or dynamic `import()` so that React, react-dom, and tldraw are only fetched when the user navigates to a diagram page. This keeps the main SPA bundle small.

## Risks / Trade-offs

- [Risk] **Commercial license**: tldraw requires a paid license for production. Must be obtained before deploying. Cost unknown — need to check tldraw.dev/pricing. Mitigation: evaluate during development, budget for license.
- [Risk] **React + Vue in same app**: Dual framework increases bundle complexity and debugging surface. Mitigation: isolate all React code in `app/components/diagrams/react/`, clear boundary at the Vue-React bridge.
- [Risk] **Snapshot size**: Large diagrams could produce 500KB+ JSON snapshots. Mitigation: compress snapshots with gzip on the wire (Nitro does this), consider JSONB or BLOB storage if SQLite text performance degrades. In practice, even complex diagrams rarely exceed 1MB.
- [Risk] **tldraw version upgrades**: tldraw iterates fast; breaking changes in shape schema or API could require migration work. Mitigation: pin tldraw version, use their built-in snapshot migration system, test upgrades in staging.
- [Risk] **Layout algorithm quality**: Auto-generated diagrams may look messy with naive layout. Mitigation: start with simple grid/tree layouts, iterate based on feedback. Users can always rearrange shapes after generation.
- [Risk] **Bundle size**: React + tldraw adds ~1.5MB gzipped. Mitigation: code-split behind dynamic import, only loaded on diagram pages. No impact on other pages.
