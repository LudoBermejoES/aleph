## Why

Aleph's tldraw diagram editor has solid infrastructure (custom shapes, entity panel, auto-save, diagram generation) but lacks the semantic depth that makes visual campaign design genuinely useful. Shapes store stale copies of entity data, arrows carry no relationship meaning, the canvas has no spatial organization primitives, and double-clicking always opens a new browser tab — all patterns that Alkemion Studio demonstrates can be done much better for TTRPG use cases.

## What Changes

- **Live entity data sync**: Shapes no longer store stale copies of entity data. At drop time only `entityId` + `slug` are persisted; a new batch endpoint hydrates portrait/name/status/tags on every canvas load.
- **Typed relationship arrows**: New `relationshipArrow` custom shape with `relType` (ally/enemy/family/serves/hunts/knows/rival), label, color, and line style. A custom toolbar appears when selected to pick/change type.
- **Region/group box shape**: New `regionBox` shape — semi-transparent colored rectangle with corner title, always sent to back. Used to section canvas into "Act 1", "Scene: The Tavern", "Faction: Black Hand".
- **Status and tag badges on NPCToken**: `statusBadge` prop (alive/dead/hostile/inactive) renders as a colored indicator circle on the portrait. Up to 3 tag chips render at the bottom. Both live-synced from campaign data.
- **Node details popover**: Double-click on any entity shape shows an inline floating panel (portrait, name, type, 2–3 line content preview, tags, "Open full page" link) instead of always opening a new tab.
- **Anchor/portal shape**: New `anchorToken` shape linking to another diagram or external URL. Renders as a pill with ↗ icon; double-click navigates within the app or opens the URL.
- **Map token shape**: New `mapToken` shape backed by campaign map data. Renders map thumbnail; double-click opens the map in a modal overlay without leaving the diagram.
- **Faction card shape**: Dedicated `factionCard` shape for organizations — heraldic-style card with crest/letter icon, faction name, alignment badge, member count. Visually distinct from NPCToken.
- **"Focus camera" from entity panel**: Clicking an already-placed entity in the sidebar panel calls `editor.zoomToShape()` to focus the camera on its first token instead of placing a duplicate.
- **Sticky note and canvas label shapes**: Pre-styled `stickyNote` (amber card, inline text editing) and `canvasLabel` (bold section header) annotation shapes with TTRPG aesthetic.
- **Auto-layout reflow button**: Toolbar button that re-runs the server-side layout algorithm against current entity shapes, repositioning them cleanly while preserving shape data.
- **Diagram type filter mode**: Toolbar toggle to show only one entity type at a time (characters/quests/locations/etc.) by hiding irrelevant shapes temporarily.

## Capabilities

### New Capabilities

- `diagram-entity-sync`: Live entity data hydration — batch fetch endpoint and client-side sync on canvas load
- `diagram-shapes-advanced`: New custom shape types — `relationshipArrow`, `regionBox`, `factionCard`, `anchorToken`, `mapToken`, `stickyNote`, `canvasLabel`
- `diagram-interaction-advanced`: Node details popover, focus-camera from panel, type filter mode, auto-layout reflow, status/tag badges

### Modified Capabilities

- `diagram-shapes`: Existing shapes (`npcToken`, `entityCard`, `locationPin`, `questNode`) gain live-sync support and status/tag badge props — requirement changes to shape data model

## Impact

- **New API endpoint**: `GET /api/campaigns/[id]/diagrams/entities/batch?ids=...` — batch entity fetch for live sync
- **New React shape components**: `RelationshipArrowShape.tsx`, `RegionBoxShape.tsx`, `FactionCardShape.tsx`, `AnchorTokenShape.tsx`, `MapTokenShape.tsx`, `StickyNoteShape.tsx`, `CanvasLabelShape.tsx`
- **Modified React components**: `NPCTokenShape.tsx`, `EntityCardShape.tsx` — add live-sync hydration and badge props; `TldrawWrapper.tsx` — register new shapes, add toolbar extensions, implement popover event bus
- **Modified Vue components**: `EntityPanel.vue` — focus-camera behavior; `TldrawCanvas.vue` — popover overlay; diagram editor page — filter toolbar
- **Modified server**: `server/utils/diagram-generator.ts` — reflow endpoint support
- **Dependencies**: No new npm packages required (tldraw BindingUtil already available in installed version)
- **CLI impact**: The batch entity endpoint is read-only and internal to the diagram editor; no CLI changes required. The new shapes are canvas-only with no CLI surface.
- **Tests**: New unit tests for batch endpoint, new integration tests for batch fetch and anchor navigation, E2E tests for popover, region box, and relationship arrow interactions
