## 1. Setup & Dependencies

- [x] 1.1 Install `@tldraw/sync` and `@tldraw/sync-core` packages (pin versions matching tldraw v4.5.7)
- [x] 1.2 Add `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` to runtime config in `nuxt.config.ts` (default `false`)
- [x] 1.3 Add `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false` to `.env.example`

## 2. Server: Room Manager Service

- [x] 2.1 Create `server/services/tldraw-rooms.ts` with `ManagedRoom` type and `rooms` Map
- [x] 2.2 Implement `getOrCreateRoom(diagramId)` — loads snapshot from `diagramSnapshots`, creates `TLSocketRoom`, returns room. Investigate whether custom shape utils need server-side registration.
- [x] 2.3 Implement `persistRoom(diagramId)` — serializes room state, writes to `diagramSnapshots` table, increments version
- [x] 2.4 Implement debounced persistence (2s after last change, max 10s forced persist)
- [x] 2.5 Implement `closeRoom(diagramId)` — persists final state, destroys `TLSocketRoom`, removes from Map
- [x] 2.6 Implement grace period logic (30s after last client disconnects before closing room)
- [x] 2.7 Implement `persistAllRooms()` for server shutdown — wire into Nitro shutdown hook
- [x] 2.8 Implement `getRoomUserCount(diagramId)` for presence UI

## 3. Server: WebSocket Route

- [x] 3.1 Create `server/routes/api/tldraw-sync/[diagramId].ts` with Nitro WebSocket handler (upgrade hook)
- [x] 3.2 Implement authentication: read session cookie from upgrade headers, fallback to `?token=` query param via `validateWsToken()`
- [x] 3.3 Implement authorization: look up diagram → get campaignId, check campaign membership, determine role
- [x] 3.4 Reject unauthenticated connections with 401, non-members with 403
- [x] 3.5 Attach authenticated client to `TLSocketRoom` via room manager, pass read-only flag for non-editor roles
- [x] 3.6 Handle client disconnect — decrement count, trigger grace period if last client

## 4. Client: TldrawWrapper Dual-Mode

- [x] 4.1 Add `syncUri` and `userInfo` props to `TldrawWrapperProps` interface in `TldrawWrapper.tsx`
- [x] 4.2 Implement sync mode: when `syncUri` is provided, use `useSync({ uri, userInfo })` to create store, pass `store` to `<Tldraw>`
- [x] 4.3 Preserve existing snapshot mode as fallback when `syncUri` is not provided
- [x] 4.4 Ensure all 11 custom shape utils are registered in both sync and snapshot modes
- [x] 4.5 Disable client-side `editor.store.listen()` save callback in sync mode (server handles persistence)

## 5. Client: Vue Wrapper & Page Updates

- [x] 5.1 Add `multiplayer`, `syncUri`, `userInfo` props to `TldrawCanvas.vue`, pass through to React mount
- [x] 5.2 Update `app/pages/campaigns/[id]/diagrams/[diagramId].vue`: compute sync WebSocket URI from runtime config and diagram ID
- [x] 5.3 Get current user info (id, name, color from user ID hash) for `userInfo` prop
- [x] 5.4 Conditionally pass `syncUri`/`userInfo` vs `snapshot` based on feature flag and connection state
- [x] 5.5 Skip REST auto-save (`onCanvasChange` / `autoSave`) when multiplayer is active

## 6. Client: Presence UI

- [x] 6.1 Create `app/components/diagrams/DiagramPresenceBar.vue` — shows connected user avatars/badges with colors in the toolbar
- [x] 6.2 Wire presence data from tldraw sync store into `DiagramPresenceBar`
- [x] 6.3 Create `app/components/diagrams/DiagramConnectionStatus.vue` — shows connected/reconnecting/disconnected indicator
- [x] 6.4 Add `DiagramPresenceBar` and `DiagramConnectionStatus` to the diagram page toolbar (visible only in multiplayer mode)
- [x] 6.5 Handle fallback: when connection status transitions to permanently disconnected, switch to REST mode and notify user

## 7. i18n

- [x] 7.1 Add English keys to `i18n/locales/en.json` for: connection status labels (connected, reconnecting, disconnected), presence labels (N users editing), multiplayer tooltip
- [x] 7.2 Add Spanish keys to `i18n/locales/es.json` for the same strings

## 8. Testing

- [x] 8.1 Unit tests (Vitest): `tldraw-rooms.ts` — room creation from snapshot, persistence serialization, grace period logic, `persistAllRooms`
- [x] 8.2 Unit tests (Vitest): `tldraw-rooms.ts` — room cleanup after grace period, debounce behavior
- [x] 8.3 Integration tests (Vitest): WebSocket route auth — authenticated editor connects (200), unauthenticated rejected (401), non-member rejected (403), player connects read-only
- [x] 8.4 Integration tests (Vitest): Room lifecycle — first connect loads snapshot, persist writes to DB, reconnect within grace period reuses room
- [x] 8.5 E2E tests (Playwright): Two browser contexts open same diagram, one creates a shape, the other sees it appear
- [x] 8.6 E2E tests (Playwright): Presence bar shows correct user count, connection status indicator works

## 9. Verification

- [x] 9.1 Run `npx vitest run tests/unit/` — all pass (969 tests, 85 files)
- [ ] 9.2 Run `npx vitest run tests/integration/` — all pass (server on port 3333) — NEEDS RUNNING SERVER
- [ ] 9.3 Run `npx playwright test` — all pass — NEEDS RUNNING SERVER
- [x] 9.4 Run `npm run build` — production build succeeds
- [ ] 9.5 Manual smoke test: open same diagram in two browser tabs, verify real-time sync and cursor visibility — NEEDS RUNNING SERVER + FLAG ENABLED
