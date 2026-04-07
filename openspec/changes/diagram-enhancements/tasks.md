## 1. Batch Entity Fetch Endpoint

- [x] 1.1 Create `server/api/campaigns/[id]/diagrams/entities/batch.get.ts` — accepts `?ids=` query param (comma-separated), returns `Record<entityId, { id, name, type, slug, portraitUrl, tags, status }>`, requires player+ role
- [x] 1.2 Apply visibility filtering in the batch endpoint — DM-only entities not returned to player-role users; unknown IDs silently omitted
- [x] 1.3 Create `server/api/campaigns/[id]/diagrams/reflow.post.ts` — accepts `{ entityIds: string[], diagramType: string }`, returns `{ positions: Record<entityId, { x, y }> }` using existing layout algorithms from `diagram-generator.ts`

## 2. Client-Side Entity Hydration

- [x] 2.1 Add `hydrateEntityShapes(editor, campaignId)` utility to `app/utils/diagram-hydration.ts` — collects all entity-linked shape IDs, splits into batches of 50, fetches from batch endpoint via `Promise.all`, calls `editor.updateShapes()` with fresh props
- [x] 2.2 Wire hydration into `TldrawWrapper.tsx` `handleMount` — call `hydrateEntityShapes` in a `setTimeout(0)` after snapshot load, passing `campaignId` via props
- [x] 2.3 Update `TldrawWrapperProps` to include `campaignId: string` and thread it through from `TldrawCanvas.vue`
- [x] 2.4 Update existing shape props schemas (`npcToken`, `entityCard`, `locationPin`, `questNode`) — add `statusBadge?: string` and `tags?: string[]` to `npcToken`; ensure all have `entityId` and `slug` as required props

## 3. NPCToken Status and Tag Badges

- [x] 3.1 Add `statusBadge` indicator to `NPCTokenShape.tsx` — small colored circle (green=alive, gray=inactive, red=hostile, gray+✕=dead) in upper-right corner of portrait frame
- [x] 3.2 Add tag chips to `NPCTokenShape.tsx` — render up to 2 chips + "+N" overflow chip below name label; each chip uses a color derived from tag name hash
- [x] 3.3 Increase `npcToken` default height from 100 to 120 to accommodate tag chips; update `getDefaultProps`

## 4. New Shape: relationshipArrow

- [x] 4.1 Create `app/components/diagrams/react/shapes/RelationshipArrowShape.tsx` — `BaseBoxShapeUtil` with props: `startX, startY, endX, endY, relType, label, bidirectional`; renders SVG line with arrowhead(s)
- [x] 4.2 Implement color and style mapping in `RelationshipArrowShape.tsx`: ally=green/dashed, enemy=red/solid, family=blue/no-arrow, serves=purple/solid, hunts=orange/solid, knows=gray/dotted, rival=red/dashed, custom=gray/solid
- [x] 4.3 Render midpoint label badge in `RelationshipArrowShape.tsx` — pill-shaped chip positioned at `(startX+endX)/2, (startY+endY)/2` when `label` is set
- [x] 4.4 Add custom toolbar in `TldrawWrapper.tsx` using tldraw's `components.Toolbar` override — shows relType picker dropdown, label input, and bidirectional toggle when a `relationshipArrow` shape is selected
- [x] 4.5 Register `RelationshipArrowShapeUtil` in `SHAPE_UTILS` array in `TldrawWrapper.tsx`

## 5. New Shape: regionBox

- [x] 5.1 Create `app/components/diagrams/react/shapes/RegionBoxShape.tsx` — `BaseBoxShapeUtil` with props: `label, color, opacity`; renders semi-transparent colored div with corner title label
- [x] 5.2 Implement `sendToBack` on selection in `RegionBoxShape.tsx` — override `onSelect` to call `editor.run(() => editor.sendToBack([shape.id]))`
- [x] 5.3 Implement inline label editing on double-click in `RegionBoxShape.tsx` — `contenteditable` div, debounced `editor.updateShape` on input
- [x] 5.4 Add color picker to custom toolbar for `regionBox` (8 preset tints: red, orange, yellow, green, blue, purple, pink, gray)
- [x] 5.5 Register `RegionBoxShapeUtil` in `SHAPE_UTILS`

## 6. New Shape: factionCard

- [x] 6.1 Create `app/components/diagrams/react/shapes/FactionCardShape.tsx` — `BaseBoxShapeUtil` with props: `entityId, slug, campaignId, factionName, crestUrl, alignment, memberCount`; renders heraldic-style card (banner area + crest/letter, name, optional alignment badge, member count)
- [x] 6.2 Add letter-fallback crest — first letter of `factionName` in a banner colored from name hash when `crestUrl` is absent
- [x] 6.3 Register `FactionCardShapeUtil` in `SHAPE_UTILS`
- [x] 6.4 Update `server/utils/diagram-generator.ts` — emit `factionCard` shapes for organization-type entities in `faction-web` and `entity-graph` diagram types

## 7. New Shape: anchorToken

- [x] 7.1 Create `app/components/diagrams/react/shapes/AnchorTokenShape.tsx` — props: `targetType ('diagram'|'external'), targetDiagramId?, targetUrl?, label`; renders pill badge with ↗ icon; double-click dispatches `aleph:navigate` DOM event
- [x] 7.2 Add broken-state rendering in `AnchorTokenShape.tsx` — when `targetType: 'diagram'` and `targetDiagramId` is present, validate it exists; show warning icon + "Diagram not found" if missing (validation via a prop `targetExists: boolean` set during hydration)
- [x] 7.3 Register `AnchorTokenShapeUtil` in `SHAPE_UTILS`
- [x] 7.4 Add `aleph:navigate` event listener in `app/pages/campaigns/[id]/diagrams/[diagramId].vue` — handles `diagram` type with `useRouter().push()` and `external` type with `window.open()`

## 8. New Shape: mapToken

- [x] 8.1 Create `app/components/diagrams/react/shapes/MapTokenShape.tsx` — props: `mapId, campaignId, mapName, thumbnailUrl`; renders thumbnail image with map name label; placeholder icon when no thumbnail; double-click dispatches `aleph:open-map`
- [x] 8.2 Register `MapTokenShapeUtil` in `SHAPE_UTILS`
- [x] 8.3 Create `app/components/diagrams/MapModal.vue` — dialog overlay that renders the map view (`/campaigns/:id/maps/:mapId` content) in an iframe or embedded component; opened via `aleph:open-map` event listener in diagram page

## 9. New Shapes: stickyNote and canvasLabel

- [x] 9.1 Create `app/components/diagrams/react/shapes/StickyNoteShape.tsx` — props: `text, color`; renders amber/yellow card with `contenteditable` div; `mousedown` stops propagation to prevent tldraw focus steal; debounced `editor.updateShape` on input; double-click focuses contenteditable
- [x] 9.2 Create `app/components/diagrams/react/shapes/CanvasLabelShape.tsx` — props: `text`; renders large bold muted-foreground text with no background; inline editing on double-click via `contenteditable`
- [x] 9.3 Register both shape utils in `SHAPE_UTILS`

## 10. Entity Details Popover

- [x] 10.1 Create `app/components/diagrams/EntityPopover.vue` — floating panel with portrait, name, type badge, content preview (2–3 lines truncated), tag chips, "Open full page" button, "Open in new tab" link; fetches full entity via `GET /api/campaigns/:id/entities/:slug` on mount; closes on outside click
- [x] 10.2 Add `aleph:entity-preview` DOM event dispatch in each entity shape's `onDoubleClick` override — payload: `{ entityId, campaignId, slug, x, y }`; call `event.stopPropagation()` to prevent tldraw text-edit mode
- [x] 10.3 Add `aleph:entity-preview` event listener in `app/pages/campaigns/[id]/diagrams/[diagramId].vue` — shows `EntityPopover.vue` positioned at event coordinates; passes `entityId`, `campaignId`, `slug`
- [x] 10.4 Skip popover in read-only mode — check `readOnly` prop before dispatching event; shapes in read-only diagrams retain original double-click-opens-new-tab behavior

## 11. Entity Panel — Focus Camera

- [x] 11.1 Update `app/components/diagrams/EntityPanel.vue` — on entity row click (not drag), if `placedCount > 0`, emit `focus-entity` event with entity ID instead of triggering drop
- [x] 11.2 Add `focus-entity` handler in `TldrawCanvas.vue` — find the first shape with matching `entityId` prop in `editor.getCurrentPageShapes()`, call `editor.zoomToShape(shapeId, { animation: { duration: 300 } })`

## 12. Diagram Editor Toolbar Enhancements

- [x] 12.1 Add type filter toolbar section to `app/pages/campaigns/[id]/diagrams/[diagramId].vue` — "All / Characters / Locations / Organizations / Quests / Wiki" toggle buttons; on change emit `filter-type` event to `TldrawCanvas.vue`
- [x] 12.2 Add `filter-type` handler in `TldrawCanvas.vue` — calls `editor.updateShapes()` setting `opacity: 0` on hidden-type shapes and `opacity: 1` on visible ones; filter state resets to "All" on component unmount
- [x] 12.3 Add "Reflow" toolbar button (DM/editor only) to diagram editor page; on click call `POST /api/campaigns/:id/diagrams/reflow` with current entity shape IDs and diagram type, then call `editor.updateShapes()` with new positions using `{ animation: { duration: 400 } }`

## 13. Tests

- [x] 13.1 Integration test: `GET /api/campaigns/:id/diagrams/entities/batch` — returns correct data for valid IDs, omits unknown IDs, returns 401 without auth, returns 200 with empty object for empty ids param
- [x] 13.2 Integration test: `POST /api/campaigns/:id/diagrams/reflow` — returns positions for provided entity IDs, respects diagram type, returns 403 for player role
- [x] 13.3 Unit test: `hydrateEntityShapes` in `diagram-hydration.ts` — batches 120 IDs into 3 requests of 50, calls `editor.updateShapes()` with merged results
- [x] 13.4 E2E test: entity popover — double-click NPCToken shows popover with name and content preview; "Open full page" navigates correctly; popover closes on outside click
- [x] 13.5 E2E test: regionBox — create region box, verify it renders behind NPCToken; double-click edits label
- [x] 13.6 E2E test: focus camera — place entity on canvas, click entity in panel, verify canvas pans to shape (shape is visible in viewport)
- [x] 13.7 E2E test: type filter — place character and location shapes, select "Characters" filter, verify location shape opacity is 0; select "All", verify restored
