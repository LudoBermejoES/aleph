## 1. Dependencies and Build Configuration

- [ ] 1.1 Install `react`, `react-dom`, `@types/react`, `@types/react-dom` as dependencies
- [ ] 1.2 Install `tldraw` as a dependency
- [ ] 1.3 Add `@vitejs/plugin-react` as a devDependency; configure it in `nuxt.config.ts` Vite plugins to process `.tsx`/`.jsx` files only (exclude `.vue`)
- [ ] 1.4 Verify `npm run build` succeeds with both Vue and React plugins active
- [ ] 1.5 Verify `npm run dev` starts without errors

## 2. Database Schema and Migrations

- [ ] 2.1 Create `server/db/schema/diagrams.ts` with `diagrams` table (id, campaignId, title, description, diagramType, createdBy, createdAt, updatedAt) and `diagramSnapshots` table (id, diagramId, snapshot, version, createdAt)
- [ ] 2.2 Generate and run Drizzle migration for the new tables
- [ ] 2.3 Add foreign key indexes on `diagrams.campaignId`, `diagramSnapshots.diagramId`

## 3. Server API — Diagram CRUD

- [ ] 3.1 Create `server/api/campaigns/[id]/diagrams/index.get.ts` — list diagrams for campaign (member+ access)
- [ ] 3.2 Create `server/api/campaigns/[id]/diagrams/index.post.ts` — create diagram (editor+ access), validate `{ title, diagramType? }`
- [ ] 3.3 Create `server/api/campaigns/[id]/diagrams/[diagramId].get.ts` — get single diagram metadata
- [ ] 3.4 Create `server/api/campaigns/[id]/diagrams/[diagramId].put.ts` — update diagram metadata (editor+ access)
- [ ] 3.5 Create `server/api/campaigns/[id]/diagrams/[diagramId].delete.ts` — delete diagram + snapshots (co_dm+ access)

## 4. Server API — Snapshot Endpoints

- [ ] 4.1 Create `server/api/campaigns/[id]/diagrams/[diagramId]/snapshot.get.ts` — return latest snapshot JSON
- [ ] 4.2 Create `server/api/campaigns/[id]/diagrams/[diagramId]/snapshot.put.ts` — save new snapshot (editor+ access), enforce 5MB size limit, increment version
- [ ] 4.3 Return 404 if diagram has no snapshots yet (empty canvas scenario)

## 5. Vue-React Bridge Component

- [ ] 5.1 Create `app/components/diagrams/react/TldrawWrapper.tsx` — React component that renders `<Tldraw />` with snapshot, readOnly, and onChange props
- [ ] 5.2 Create `app/components/diagrams/TldrawCanvas.vue` — Vue component that uses `createRoot` to mount TldrawWrapper into a `<div ref>`, passes snapshot/readOnly/onSave as props, unmounts on destroy
- [ ] 5.3 Import TldrawCanvas via `defineAsyncComponent` or dynamic `import()` to ensure code splitting
- [ ] 5.4 Add tldraw CSS import in the React wrapper (tldraw requires `tldraw/tldraw.css`)

## 6. Custom tldraw Shapes

- [ ] 6.1 Create `app/components/diagrams/react/shapes/EntityCardShape.tsx` — ShapeUtil for EntityCard (rounded rect with entity name, type icon, portrait)
- [ ] 6.2 Create `app/components/diagrams/react/shapes/QuestNodeShape.tsx` — ShapeUtil for QuestNode (status-colored rectangle with quest title)
- [ ] 6.3 Create `app/components/diagrams/react/shapes/LocationPinShape.tsx` — ShapeUtil for LocationPin (pin icon with name label)
- [ ] 6.4 Create `app/components/diagrams/react/shapes/NPCTokenShape.tsx` — ShapeUtil for NPCToken (circular token with name and portrait)
- [ ] 6.5 Register all custom shapes in TldrawWrapper via `shapeUtils` prop
- [ ] 6.6 Implement double-click navigation: EntityCard, QuestNode, LocationPin, NPCToken open linked entity in new tab on double-click

## 7. Diagram List Page

- [ ] 7.1 Create `app/pages/campaigns/[id]/diagrams/index.vue` — list all diagrams, create/delete buttons for editor+ role
- [ ] 7.2 Add "New Diagram" dialog with title input and optional diagram type selector
- [ ] 7.3 Add delete confirmation dialog
- [ ] 7.4 Add navigation link to diagrams in the campaign sidebar/nav

## 8. Diagram Editor Page

- [ ] 8.1 Create `app/pages/campaigns/[id]/diagrams/[diagramId].vue` — loads diagram metadata + snapshot, renders TldrawCanvas
- [ ] 8.2 Implement auto-save: debounce 5 seconds after canvas changes, PUT snapshot to server
- [ ] 8.3 Implement manual Save button in a toolbar above the canvas
- [ ] 8.4 Implement role-based read-only mode: check campaign role, pass `readOnly` to TldrawCanvas for player/visitor
- [ ] 8.5 Add back-navigation breadcrumb: Campaign > Diagrams > [title]
- [ ] 8.6 Handle loading and error states (skeleton, error toast)

## 9. Entity Panel

- [ ] 9.1 Create `app/components/diagrams/EntityPanel.vue` — collapsible left sidebar with toggle button; persist collapsed state to localStorage
- [ ] 9.2 Add debounced search input (300ms) that calls a unified entity search endpoint
- [ ] 9.3 Create `server/api/campaigns/[id]/diagrams/entities.get.ts` — search across characters, locations, organizations, items, quests, wiki entities by `?q=` param; return results grouped by type (max 10 per type when query is empty)
- [ ] 9.4 Render entity results in the panel: portrait thumbnail (or type-icon placeholder) + entity name, grouped by type with section headers
- [ ] 9.5 Implement drag-and-drop: set `draggable="true"` on entity cards, store entity data in `dataTransfer` on `dragstart`
- [ ] 9.6 In TldrawCanvas/TldrawWrapper: listen for `drop` events on the canvas container, convert screen coordinates to page coordinates via `editor.screenToPage()`, create the appropriate custom shape at that position
- [ ] 9.7 Implement badge indicator: on every canvas change, read `editor.getCurrentPageShapes()`, collect placed `entityId` values into a Set/count map, pass to EntityPanel as a prop so cards show a count badge (①, ②, etc.)
- [ ] 9.8 Hide EntityPanel entirely when user role is player or visitor
- [ ] 9.9 Wire EntityPanel into the diagram editor page layout alongside TldrawCanvas

## 10. Diagram Generation

- [ ] 10.1 Create `server/utils/diagram-generator.ts` — module with `generateDiagram(db, campaignId, type)` function
- [ ] 10.2 Implement entity-graph generator: query entities + relationships, create EntityCard shapes + arrow bindings, apply force-directed layout
- [ ] 10.3 Implement quest-tree generator: query quests with parent/child, create QuestNode shapes + arrows, apply tree layout
- [ ] 10.4 Implement faction-web generator: query organizations + members, create shapes + arrows, apply radial layout
- [ ] 10.5 Implement session-timeline generator: query sessions chronologically, create shapes in left-to-right layout
- [ ] 10.6 Create `server/api/campaigns/[id]/diagrams/generate.post.ts` — validate `{ type, title? }`, call generator, save as new diagram + snapshot, return diagram metadata

## 11. CLI Commands

- [ ] 11.1 Create `cli/src/commands/diagram.js` with `list`, `create`, `delete`, `generate` subcommands
- [ ] 11.2 `diagram list --campaign <id> [--json]` — GET and display diagrams
- [ ] 11.3 `diagram create --campaign <id> --title <title> [--type <type>] [--json]` — POST new diagram
- [ ] 11.4 `diagram delete <diagramId> --campaign <id> [--yes]` — DELETE with confirmation
- [ ] 11.5 `diagram generate --campaign <id> --type <type> [--title <title>] [--json]` — POST generate
- [ ] 11.6 Register diagram command in `cli/bin/aleph.js`

## 12. i18n

- [ ] 12.1 Add diagram-related keys to `i18n/locales/en.json`: `diagrams.title`, `diagrams.create`, `diagrams.delete`, `diagrams.confirmDelete`, `diagrams.empty`, `diagrams.save`, `diagrams.saving`, `diagrams.saved`, `diagrams.generate`, `diagrams.types.*`, `diagrams.errors.*`, `diagrams.panel.search`, `diagrams.panel.empty`, `diagrams.panel.noResults`
- [ ] 12.2 Add matching keys to `i18n/locales/es.json`

## 13. Skill File Updates

- [ ] 13.1 Update `docs/claude-skill.md` — document `diagram list/create/delete/generate` commands
- [ ] 13.2 Update `.claude/skills/aleph-cli/SKILL.md` — mirror diagram commands, bump version

## 14. Tests

- [ ] 14.1 Unit test (`tests/unit/diagram-generator.test.ts`): test entity-graph generator produces correct shape types and layout; test with empty data returns error
- [ ] 14.2 Unit test (`tests/unit/diagram-generator.test.ts`): test quest-tree, faction-web, session-timeline generators
- [ ] 14.3 Integration test (`tests/integration/diagram-api.test.ts`): CRUD endpoints — create, list, get, update, delete diagram; auth enforcement (401, 403 for player, 200 for editor)
- [ ] 14.4 Integration test (`tests/integration/diagram-api.test.ts`): snapshot save/load — PUT snapshot, GET latest, verify content matches; test 413 for oversized snapshot
- [ ] 14.5 Integration test (`tests/integration/diagram-api.test.ts`): generate endpoint — test each type, verify diagram + snapshot are created
- [ ] 14.6 Integration test (`tests/integration/diagram-api.test.ts`): entity search endpoint — returns grouped results, respects query param, returns empty for unknown query
- [ ] 14.7 E2E test (`tests/e2e/diagrams.spec.ts`): create diagram from list page, verify canvas loads, navigate back
- [ ] 14.8 E2E test (`tests/e2e/diagrams.spec.ts`): delete diagram from list page with confirmation
- [ ] 14.9 E2E test (`tests/e2e/diagrams.spec.ts`): entity panel — search for a character, verify result appears with name; drag onto canvas, verify badge appears on entity card

## 15. Verification

- [ ] 15.1 Run `npx vitest run tests/unit/` — all unit tests pass
- [ ] 15.2 Run `npx vitest run tests/integration/` — all integration tests pass
- [ ] 15.3 Run `npx playwright test tests/e2e/diagrams.spec.ts` — all E2E tests pass
- [ ] 15.4 Run `npm run build` — no build errors, verify code splitting (React/tldraw in separate chunks)
- [ ] 15.5 Run `npm run format:check` — no formatting issues
