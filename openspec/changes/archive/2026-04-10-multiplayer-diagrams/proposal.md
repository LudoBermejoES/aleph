## Why

Diagrams are currently single-user: edits are saved via REST snapshots with a 1-second debounce and no conflict resolution. When multiple campaign members open the same diagram, they work in isolation and the last save wins. This makes diagrams unusable as a shared planning surface during sessions — the exact moment when DMs and players most need to collaborate on spatial layouts, faction webs, and quest trees. The collaboration infrastructure already exists for text (Hocuspocus + Yjs), but diagrams were never wired into any real-time sync.

## What Changes

- Install `@tldraw/sync` and `@tldraw/sync-core` packages for tldraw's official multiplayer protocol
- Add a new WebSocket route (`/api/tldraw-sync/[diagramId]`) that manages per-diagram `TLSocketRoom` instances with authentication and role-based permissions
- Create a server-side room manager service that handles room lifecycle (create, persist, cleanup) backed by the existing `diagramSnapshots` table
- Modify `TldrawWrapper.tsx` to support a `useSync()` mode that creates a synced store instead of loading a static snapshot
- Update `TldrawCanvas.vue` and the diagram page to pass multiplayer props and display connected users
- Add presence UI: remote cursors with name labels and colors, connected-user avatars in the toolbar, connection status indicator
- Enforce read-only mode server-side for non-editor roles
- Graceful fallback to current REST snapshot mode when WebSocket connection fails
- Runtime feature flag (`NUXT_PUBLIC_DIAGRAM_MULTIPLAYER`) for gradual rollout

## Capabilities

### New Capabilities

- `diagram-sync`: Real-time shape synchronization between multiple clients via `@tldraw/sync` WebSocket protocol, including server-side room management, persistence to `diagramSnapshots`, and room lifecycle (create on first connect, destroy after grace period)
- `diagram-presence`: User presence on the diagram canvas — remote cursors, selection highlights, user color/name labels, connected-user avatar bar in toolbar, and connection status indicator

### Modified Capabilities

- `collaboration`: The existing collaboration spec covers Hocuspocus-based text editing. Diagram multiplayer adds a second real-time collaboration channel (tldraw sync) that shares the same auth flow (session cookies + WS tokens) but uses a different protocol and server component.

## Impact

- **New packages**: `@tldraw/sync`, `@tldraw/sync-core`
- **New server files**: WebSocket route at `server/routes/api/tldraw-sync/[diagramId].ts`, room manager service at `server/services/tldraw-rooms.ts`
- **Modified files**: `app/components/diagrams/react/TldrawWrapper.tsx` (dual-mode store), `app/components/diagrams/TldrawCanvas.vue` (multiplayer props), `app/pages/campaigns/[id]/diagrams/[diagramId].vue` (sync URI, user info, presence toolbar)
- **Existing infrastructure reused**: `server/services/ws-token.ts` for WS authentication, `server/db/schema/diagrams.ts` for persistence (no schema changes), Nitro experimental WebSocket (already enabled)
- **No DB schema changes**: Existing `diagramSnapshots` table stores tldraw snapshots as JSON — the same format used by `TLSocketRoom`
- **Runtime config**: New `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` flag
- **aleph-cli**: No CLI impact — diagrams are not managed via CLI, and no API endpoints used by CLI are modified
- **i18n**: New keys for connection status, presence labels, and multiplayer UI strings in `i18n/locales/en.json` and `i18n/locales/es.json`
