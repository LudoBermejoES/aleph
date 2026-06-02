# Diagrams: React-in-Nuxt + tldraw + live sync

The diagram canvas is the most architecturally unusual part of Aleph. tldraw is a **React** library; Aleph is **Vue**. Making them coexist — and adding multiplayer sync and custom RPG shapes on top — takes three non-obvious pieces.

## 1. Running React inside Nuxt

tldraw's shape system renders with React components, so Aleph embeds a small React island inside the Vue app. The integration lives in `nuxt.config.ts` as a custom module (`reactIntegrationModule`) plus build config. It does three things:

1. **Hands `.tsx` to React, not Vue.** Nuxt registers `@vitejs/plugin-vue-jsx`, which would try to compile `.tsx` as Vue JSX. The module removes the `vite:vue-jsx` plugin at `configResolved` time (after Nuxt unshifts it) so `@vitejs/plugin-react-swc` exclusively owns `.tsx`.
2. **Injects the React Fast Refresh preamble.** In dev, React HMR needs a preamble script in the HTML `<head>`. Nitro bypasses Vite's `transformIndexHtml`, so the module injects it manually (`$RefreshReg$`, `$RefreshSig$`, `__vite_plugin_react_preamble_installed__`).
3. **Configures the production build** to transform `.tsx` with esbuild (`jsx: 'automatic'`, `jsxImportSource: 'react'`).

The React tree is mounted into a Vue component: `TldrawCanvas.vue` (Vue) mounts `TldrawWrapper.tsx` (React) through a small portal. From the rest of the app's perspective, it's just a Vue component with props and events.

> If you change the React integration, the failure modes are subtle: `.tsx` silently compiled as Vue JSX, or HMR breaking in dev only. Keep `@vitejs/plugin-react-swc` (it already supports a wide Vite range) and don't bump `@vitejs/plugin-react` to a version that requires a newer Vite than Nuxt ships.

## 2. Custom RPG shapes

Generic boxes aren't enough for a campaign tool, so Aleph defines ~12 custom tldraw shapes in `app/components/diagrams/react/shapes/`:

`EntityCardShape`, `NPCTokenShape`, `LocationPinShape`, `FactionCardShape`, `RegionBoxShape`, `AnchorTokenShape`, `MapTokenShape`, `StickyNoteShape`, `CanvasLabelShape`, `GenealogyNodeShape`, `QuestNodeShape`, `RelationshipArrowShape`.

Each extends `BaseBoxShapeUtil` and defines:

- `static type` + `static props` (a `RecordProps` validator schema)
- `getDefaultProps()`
- `component()` — the React render (JSX)
- `getIndicatorPath()` — the selection outline, returning a `Path2D`

> **tldraw v5 note:** in v5 the selection indicator method is `getIndicatorPath()` returning a `Path2D`, _not_ the old `indicator()` returning JSX. The old method still compiles but renders nothing — so a v4→v5 upgrade must port every custom shape or selection outlines silently vanish. All shapes here use `path.rect(0, 0, w, h)`.

The **same shapes must be described twice**: as React `ShapeUtil`s on the client (above), and as validator schemas on the **server** in `server/services/tldraw-shape-schemas.ts` (`createTLSchema` + `defaultShapeSchemas` + the custom ones). The server schema is what validates persisted snapshots and sync messages, so the two definitions must agree.

## 3. Live sync + persistence

Diagram multiplayer is gated by `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` and flows over a dedicated WebSocket, separate from the prose collaboration channel.

### Client

`TldrawWrapper.tsx` has two modes:

- **Snapshot mode** (default / single-player): loads a snapshot over HTTP, saves changes back via REST. **No WebSocket is opened.**
- **Sync mode** (multiplayer): a separate `TldrawWrapperSync` component calls `useSync({ uri, users, assets, shapeUtils, bindingUtils })` from `@tldraw/sync`, connecting to `ws(s)://<host>/api/tldraw-sync/<diagramId>`.

> The two modes are **separate components** on purpose. `useSync` (v5) aggressively retries its WebSocket even against a placeholder URI, so calling it in snapshot mode spams `ws://unused` connection attempts. Keeping `useSync` inside a component that only renders when multiplayer is actually active avoids that entirely while respecting React's rules of hooks.
>
> User identity for presence uses the v5 `users: TLUserStore` API (an `atom` holding the current `TLUser`), not the removed v4 `userInfo` option.

### Server

- `server/routes/api/tldraw-sync/[diagramId].ts` handles the WebSocket upgrade and wraps each peer as a `WebSocketMinimal` (`send` + `readyState`).
- `server/services/tldraw-rooms.ts` manages one `TLSocketRoom` per diagram:
  - **Debounced persistence:** ~2s after the last change, 10s max during active editing.
  - **Grace period:** ~30s after the last user leaves before the room is torn down.
  - **Retention:** keeps the N most recent snapshots per diagram (`diagramSnapshots` table).
  - **Clean shutdown:** SIGTERM/SIGINT hooks flush all rooms before exit.

### Snapshots & migration

Snapshots are stored as JSON in `diagramSnapshots`. tldraw snapshots embed their schema (`store.schema.serialize()`), so when a snapshot saved under an older tldraw version is loaded, tldraw's migration engine upgrades it automatically — no manual data migration needed on a tldraw upgrade. (Re-saving writes the newer schema version, so take a DB backup before first load after a major bump.)

## Verifying it works

- **Snapshot mode is clean** when DevTools → Network → WS shows **zero** WebSocket connections on a diagram page.
- **Sync mode works** when, with `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true`, you see a `101 Switching Protocols` WS connection to `/api/tldraw-sync/<id>` exchanging binary frames, and a second tab on the same diagram reflects edits live.
