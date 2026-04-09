## Context

Diagrams in Aleph use tldraw v4.5.7 embedded via a React-in-Vue bridge (`TldrawCanvas.vue` → `TldrawWrapper.tsx`). Edits are saved client-side as tldraw `TLEditorSnapshot` JSON via `PUT /api/campaigns/{id}/diagrams/{diagramId}/snapshot` with a 1-second debounce. There is no real-time synchronization — each user works in isolation.

The app already has two real-time collaboration channels:

1. **Hocuspocus + Yjs** (port 3334) — text editing for entities, sessions, quests via ProseMirror/Tiptap
2. **Custom WebSocket** (`/api/ws`) — campaign-wide presence, dice rolls, notifications

The diagram page (`app/pages/campaigns/[id]/diagrams/[diagramId].vue`) loads a snapshot on mount, passes it to `<TldrawCanvas>`, and listens for `save` events to persist. 11 custom shape utils are registered for campaign-specific shapes (NPCToken, EntityCard, LocationPin, QuestNode, FactionCard, etc.).

## Goals / Non-Goals

**Goals:**

- Multiple campaign members can edit the same diagram simultaneously with real-time shape sync
- Users see each other's cursors, selections, and names on the canvas
- Server enforces role-based permissions (editor+ can edit, others are read-only viewers)
- Existing single-user REST snapshot flow remains as fallback
- No database schema changes required

**Non-Goals:**

- Cursor chat (tldraw supports it, deferring to a future iteration)
- Viewport following ("follow user X's camera")
- Offline editing / conflict resolution when disconnected
- Multi-server room scaling (single Nitro process is sufficient)
- Undo/redo synchronization across users (each user keeps their own stack — tldraw default)

## Decisions

### 1. Use `@tldraw/sync` instead of extending Hocuspocus

**Choice**: Install `@tldraw/sync` + `@tldraw/sync-core` and use tldraw's native sync protocol.

**Alternatives considered**:

- **Extend Hocuspocus**: Would require encoding tldraw's record store into Yjs structures, handling schema migrations manually, and maintaining a custom bridge. Hocuspocus is optimized for ProseMirror text — not shape geometry, bindings, and assets.
- **Custom WebSocket sync**: Use `editor.store.listen()` to broadcast diffs over the existing `/api/ws` channel. Requires manual conflict resolution and doesn't handle tldraw record types natively.
- **Yjs community integration**: Libraries like `yjs-tldraw` exist but are unmaintained and lag behind tldraw releases.

**Rationale**: `@tldraw/sync` is maintained by the tldraw team, handles record schema migrations, and provides built-in presence (cursors, selections). It is the only option that doesn't require maintaining a custom sync layer.

### 2. Dedicated WebSocket route per diagram

**Choice**: New route at `server/routes/api/tldraw-sync/[diagramId].ts` using Nitro's experimental WebSocket support (already enabled for `/api/ws`).

**Alternatives considered**:

- **Multiplex over existing `/api/ws`**: Would require a message-routing layer to separate diagram sync traffic from campaign presence/dice/notifications. Increases complexity of both systems.
- **Separate server process**: Like Hocuspocus on port 3334. Adds operational complexity with no benefit — Nitro WebSocket handles upgrades on the same port.

**Rationale**: A dedicated route keeps diagram sync isolated from campaign WebSocket traffic. Nitro's WebSocket support is proven (used by `/api/ws`). The `[diagramId]` param naturally maps to one room per diagram.

### 3. In-memory room manager with DB persistence

**Choice**: `server/services/tldraw-rooms.ts` maintains a `Map<string, ManagedRoom>` of active `TLSocketRoom` instances. Rooms are created on first connection, persist to `diagramSnapshots` on a debounce timer, and are destroyed after a grace period when all clients disconnect.

**Room lifecycle**:

1. First client connects → load latest snapshot from DB → create `TLSocketRoom`
2. Edits sync in-memory between connected clients
3. Debounce timer (2s) fires → serialize room state → write to `diagramSnapshots` (increment version)
4. Last client disconnects → start 30s grace period
5. Grace period expires → persist final state → destroy room
6. Server shutdown → persist all active rooms

**Rationale**: In-memory rooms avoid DB round-trips for every shape change. The 2s debounce matches Hocuspocus's persistence pattern. The 30s grace period prevents room churn from brief disconnections (tab switches, network blips).

### 4. Dual-mode TldrawWrapper (sync vs snapshot)

**Choice**: `TldrawWrapper.tsx` accepts an optional `syncUri` prop. When present, it uses `useSync()` to create a synced store. When absent, it uses the current `snapshot` prop for single-user mode.

```tsx
if (syncUri && userInfo) {
  const store = useSync({ uri: syncUri, userInfo })
  return <Tldraw store={store} shapeUtils={SHAPE_UTILS} ... />
}
return <Tldraw snapshot={snapshot} shapeUtils={SHAPE_UTILS} ... />
```

**Rationale**: Keeps backward compatibility. The fallback activates when: (a) the feature flag is off, (b) WebSocket connection fails, or (c) the server doesn't support sync. No breaking changes to existing diagram behavior.

### 5. Authentication via upgrade headers

**Choice**: The WebSocket upgrade request carries session cookies (automatic in browsers). Server reads `better-auth.session_token` from the cookie header. Falls back to a `?token=` query parameter (using existing `validateWsToken` from `server/services/ws-token.ts`).

**Rationale**: Identical to the existing `/api/ws` auth pattern. No new auth endpoints needed. The WS token fallback handles edge cases where cookies aren't sent on WebSocket upgrades.

### 6. Feature flag for rollout

**Choice**: `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` runtime config flag. When `false` (default), the diagram page skips sync URI computation and uses the current REST mode.

**Rationale**: Allows deploying the code without enabling multiplayer. Can be toggled per-environment. Safe rollback by setting to `false`.

## Risks / Trade-offs

- **Memory pressure from many open rooms** → Rooms are destroyed after 30s of inactivity. A hard limit (e.g., 50 active rooms) can be added if needed. Each `TLSocketRoom` holds a single diagram's worth of shapes in memory — typically <1MB.
- **`@tldraw/sync` version coupling with tldraw v4.5.7** → Pin `@tldraw/sync` and `@tldraw/sync-core` to versions matching the installed tldraw release. Test before upgrading either package independently.
- **Custom shapes must register identically on client and server** → All 11 custom shape utils are already defined in client code. `TLSocketRoom` on the server doesn't render shapes — it only syncs records — so custom shape registration may not be needed server-side. Verify during implementation.
- **Snapshot format compatibility between sync rooms and REST endpoint** → Both use tldraw's `TLEditorSnapshot` format. The existing `PUT /snapshot` endpoint and `TLSocketRoom.loadSnapshot()` operate on the same structure. No format divergence expected.
- **Nitro WebSocket limitations** → Nitro's experimental WebSocket has been stable for the existing `/api/ws` route. If issues arise with concurrent connections, the tldraw sync route can be moved to a dedicated server (like Hocuspocus).

## Migration Plan

1. Install packages, create server files, modify client files behind feature flag (flag defaults to `false`)
2. Deploy with flag off — no behavior change for users
3. Enable flag in staging, test with multiple concurrent users
4. Enable in production
5. Rollback: set flag to `false` — instant revert to REST mode, no data loss (snapshots are always persisted)

## Open Questions

- Does `TLSocketRoom` require custom shape utils to be registered server-side for schema validation, or does it pass records through opaquely? (Investigate during task 2)
- What is the maximum snapshot size `TLSocketRoom` can handle efficiently? Current REST endpoint caps at 5MB. (Test with large diagrams)
- Should the existing `PUT /snapshot` REST endpoint be aware of active sync rooms to avoid conflicts? (Likely yes — if a room is active, REST writes should be rejected or routed through the room)
