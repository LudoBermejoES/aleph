## Context

The tldraw diagram editor in Aleph uses a Vue+React bridge pattern: a Vue wrapper (`TldrawCanvas.vue`) mounts a React component tree (`TldrawWrapper.tsx`) using `createRoot`. Custom shapes (`NPCTokenShapeUtil`, `EntityCardShapeUtil`, etc.) extend tldraw's `BaseBoxShapeUtil` and store entity data directly in their props at drop time.

The core limitation is that shape props are a snapshot of entity data at drop time — `characterName`, `portraitUrl`, `slug` are copied into the tldraw document store and never updated. As the campaign evolves (portraits uploaded, names changed, quest statuses updated) the canvas silently shows stale data.

The second limitation is semantic poverty: tldraw's built-in arrow carries no domain meaning. The diagram generator produces arrows between entities but they're visually indistinct from any free-drawn arrow.

The tldraw library version in use supports `BaseBoxShapeUtil`, `HTMLContainer`, custom `RecordProps`, and `editor.updateShapes()` — all the primitives needed for this work. The `BindingUtil` API for custom arrow bindings is also available.

## Goals / Non-Goals

**Goals:**

- Entity-linked shapes always display current campaign data (portrait, name, status, tags)
- Relationship arrows carry semantic type, label, and visual style
- Canvas supports spatial organization via region boxes
- NPCTokens show character status and tag chips
- Double-click shows an inline popover instead of forcing a new tab
- New shape types: `relationshipArrow`, `regionBox`, `factionCard`, `anchorToken`, `mapToken`, `stickyNote`, `canvasLabel`
- Entity panel focuses camera on already-placed entities instead of placing duplicates
- Toolbar gains type filter and reflow controls

**Non-Goals:**

- Real-time multiplayer sync of canvas changes (Hocuspocus collaboration for diagrams is out of scope)
- Full Alkemion-style Node/Token separation (we hydrate on load, not a live reactive store)
- Persisting relationship arrow types back to the `entityRelations` DB table (arrows are canvas-only)
- Mobile / touch-specific interaction patterns

## Decisions

### Decision 1: Hydration-on-load rather than live reactive store

**Chosen:** On `editor.onMount`, identify all entity-linked shapes (`npcToken`, `entityCard`, `locationPin`, `questNode`, `factionCard`), collect their `entityId` values, batch-fetch via `GET /api/campaigns/:id/diagrams/entities/batch?ids=a,b,c`, then call `editor.updateShapes([...])` with fresh props. Shapes in the tldraw document store still hold `entityId` + `slug` as their canonical identity; all other display props (`characterName`, `portraitUrl`, `statusBadge`, `tags`) are hydrated and not persisted.

**Alternative considered:** Derive all display data from `entityId` at render time via a React context/store that fetches entity data. This is cleaner architecturally but requires a React context wrapping the entire tldraw tree, which conflicts with tldraw's internal React tree. The hydration approach keeps the shape store as the single source of truth for tldraw while still delivering fresh data.

**Why not persist stale data at all:** Clearing display props from the schema would require a migration of existing snapshots. Instead we keep the props writable — the hydration step overwrites them on load. This is backward-compatible with existing snapshots.

### Decision 2: Batch entity endpoint returns minimal fields

The new `GET /api/campaigns/:id/diagrams/entities/batch?ids=...` endpoint returns only the fields shapes need: `{ id, name, type, slug, portraitUrl, tags, status }`. It does NOT return entity content/markdown. Content for the popover is fetched lazily on demand (see Decision 5).

**Why:** Batch-fetching full entity content for every shape on canvas load is expensive for large campaigns. The popover content fetch is deferred until the user actually double-clicks.

### Decision 3: relationshipArrow uses custom ShapeUtil, not BindingUtil

**Chosen:** Implement `RelationshipArrowShapeUtil` as a `BaseBoxShapeUtil` with `startX/Y` and `endX/Y` props rendered as an SVG line. A custom toolbar (rendered via tldraw's `components.Toolbar` override) appears when the shape is selected.

**Alternative considered:** Use tldraw's `BindingUtil` to create semantic bindings on top of tldraw's built-in arrow. This would be more architecturally correct (arrows would snap to shape edges) but `BindingUtil` requires deep integration with tldraw's internal pointer event system. The custom shape approach is simpler, more predictable, and still supports manual endpoint dragging via shape resize handles.

**Trade-off:** Custom arrows won't auto-connect to shape edges like tldraw native arrows. Users draw them manually with drag. This is acceptable for a first iteration.

### Decision 4: regionBox is always sent to back via z-ordering

tldraw's document store maintains shape insertion order for rendering (later = on top). `RegionBoxShapeUtil` overrides `canBeLaidOutBy` to return false and adds an `onSelect` hook that calls `editor.sendToBack([shape.id])` immediately on selection. This keeps region boxes behind all other shapes automatically.

**Alternative considered:** A separate "background layer" concept. tldraw v4 does not support named layers. The `sendToBack` approach is the idiomatic workaround.

### Decision 5: Popover is rendered in the Vue layer, not inside React

The entity details popover is a Vue component (`EntityPopover.vue`) rendered in the diagram editor page template, positioned absolutely over the canvas. The React layer emits a custom DOM event (`aleph:entity-preview`) with `{ entityId, campaignId, slug, x, y }` via `window.dispatchEvent`. The Vue layer listens and shows the popover.

**Why:** Rendering a shadcn-vue popover from inside tldraw's React tree would require replicating the entire design system in React. The DOM event bridge is clean and keeps design system components in Vue where they belong.

**Concern:** Double-click on a shape fires both tldraw's internal double-click handler AND our custom one. We call `event.stopPropagation()` in `onDoubleClick` to prevent tldraw from entering text-edit mode.

### Decision 6: anchorToken navigation uses `window.dispatchEvent`

Same DOM event bridge as the popover: `aleph:navigate` with `{ type: 'diagram'|'external', diagramId?, url? }`. The Vue layer handles actual navigation via `useRouter().push()` or `window.open()`.

**Why:** `window.open` and `useRouter` are not available inside tldraw's React tree without complex injection.

### Decision 7: mapToken shows thumbnail, opens modal

`mapToken` stores `mapId`, `mapName`, `thumbnailUrl`. On mount it fetches the thumbnail. Double-click fires `aleph:open-map` event; the Vue layer opens a `MapModal.vue` overlay. The map thumbnail is fetched from `/api/campaigns/:id/maps/:mapId` at drop time and persisted in the shape so the token is visible even offline.

### Decision 8: stickyNote and canvasLabel use inline contenteditable

tldraw's `HTMLContainer` supports `contenteditable` divs. Both shapes render a `contenteditable` div. On content change they call `editor.updateShape({ id, props: { text: ... } })` via a debounced handler. This avoids implementing a full text shape util and keeps editing in-place.

### Decision 9: factionCard replaces entityCard for organizations in diagram generator

The diagram generator is updated to emit `factionCard` shapes for organization-type entities instead of `entityCard`. Existing snapshots with `entityCard` shapes for organizations continue to render correctly (entityCard handles all entity types). New generated diagrams get the richer visual.

### Decision 10: Type filter uses editor opacity, not shape deletion

The toolbar filter toggle calls `editor.updateShapes(shapes.map(s => ({ id: s.id, opacity: visible ? 1 : 0 })))` for all shapes of the hidden type. This avoids modifying the document store and is trivially reversible. Filter state lives in React component state (not persisted — it's a view mode).

## Risks / Trade-offs

- **Hydration race condition** → If `editor.updateShapes()` fires before the initial snapshot is fully loaded, shapes may revert. Mitigation: call hydration inside a `setTimeout(0)` after `onMount` to yield to tldraw's snapshot loading.
- **Batch endpoint size** → A diagram with 200+ entity shapes could generate a long query string. Mitigation: split IDs into batches of 50 with `Promise.all`.
- **Custom arrow without snap-to-shape** → `RelationshipArrow` endpoints don't snap to shape edges. Mitigation: document as known limitation; add snap behavior in a follow-up.
- **contenteditable in HTMLContainer** → tldraw's pointer event handling may conflict with contenteditable focus. Mitigation: call `event.stopPropagation()` on `mousedown` inside contenteditable to prevent tldraw from stealing focus.
- **sendToBack on regionBox** → Calling `sendToBack` in `onSelect` causes a store mutation during selection handling, which tldraw may queue. Mitigation: wrap in `editor.run(() => editor.sendToBack([...]))` to batch.
- **Existing snapshots** → New shape types won't exist in old snapshots. `parseTldrawJsonFile` strips unknown shape types safely — no migration needed.

## Migration Plan

1. Add batch endpoint (no schema change, additive)
2. Add new shape utils to `SHAPE_UTILS` array in `TldrawWrapper.tsx` (additive, backward-compatible)
3. Add hydration call to `handleMount` (runs on every diagram open, no migration)
4. Update `diagram-generator.ts` to emit `factionCard` for organizations (new diagrams only)
5. No DB migrations required
6. No breaking changes to existing snapshots or API contracts

## Open Questions

- Should the `relationshipArrow` type list be drawn from the campaign's actual `relation-types` table, or use a fixed vocabulary? Fixed vocabulary is simpler for v1; pulling from the DB makes it campaign-specific. **Decision deferred to specs.**
- Should `statusBadge` on NPCToken be DM-only or visible to players too? Likely DM-only for hostile/dead statuses. **Decision deferred to specs.**
- Should the entity popover support editing (inline name/tag changes) or be read-only? Read-only for v1 — editing adds significant complexity.
