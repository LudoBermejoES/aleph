/**
 * `diagram_snapshots.snapshot` has held THREE different, mutually-incompatible JSON shapes across
 * this codebase's history, all for the same logical "one tldraw document":
 *
 * 1. `TLStoreSnapshot` — `{ schema, store }`, `store` keyed by record id. What
 *    `toTldrawSnapshot()` (`diagram-generator.ts`) writes at generation time, and the canonical
 *    shape every reader in this codebase was originally written to expect.
 * 2. `TLEditorSnapshot` — `{ document: { schema, store }, session }`. What the browser's REST
 *    autosave path sends: `TldrawWrapper.tsx` calls tldraw's own `getSnapshot(editor.store)`,
 *    which returns this wrapper shape, not (1), and `snapshot.put.ts` stores it verbatim with no
 *    schema validation.
 * 3. `RoomSnapshot` — `{ documents: [{ state, lastChangedClock }], tombstones, schema, ... }`.
 *    What `TLSocketRoom.getCurrentSnapshot()` returns, and what `tldraw-rooms.ts`'s debounced
 *    persist writes verbatim whenever the diagram has been edited through the real-time sync
 *    room — which is the only path production actually takes, since
 *    `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true` there. Measured against the live database
 *    (`openspec/changes/normalize-diagram-rest-snapshot-format/design.md`, D2): 8 of 9 diagrams
 *    with a persisted snapshot are already in this shape.
 *
 * `tldraw-rooms.ts`'s own `loadSnapshotFromDb` already normalizes (2) into (1) when re-hydrating a
 * room, because `TLSocketRoom`'s `initialSnapshot` parameter accepts `RoomSnapshot |
 * TLStoreSnapshot` directly (verified in `@tldraw/sync-core`'s own `.d.ts`) — so it never needed a
 * `RoomSnapshot → TLStoreSnapshot` branch. The REST `GET .../snapshot` endpoint has no such
 * annotation and, worse, feeds the raw value straight into `filterSnapshotByVisibility`, which
 * only defends against a MISSING `.store` (a genuinely malformed save) — a `RoomSnapshot` has no
 * `.store` either, but it is not malformed, so the filter silently no-ops and the caller gets a
 * plausible-looking but wrong object back, unfiltered.
 *
 * This module is the one place that converts any of the three into the single canonical shape
 * (1), so every reader downstream — `filterSnapshotByVisibility`, and any future consumer of the
 * REST endpoint — only ever has to deal with `{ schema, store }`.
 */

export interface NormalizedTldrawSnapshot {
  schema: unknown
  store: Record<string, unknown>
}

/**
 * Converts any of the three known persisted shapes into `{ schema, store }`. Returns `null` for
 * anything else, so callers can fall back to their own pre-existing defensive handling of a
 * genuinely malformed row instead of this function inventing a guess.
 */
export function normalizeStoredSnapshot(raw: unknown): NormalizedTldrawSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  // Shape 1 — TLStoreSnapshot: already canonical, pass through.
  if (obj.store && typeof obj.store === 'object') {
    return { schema: obj.schema, store: obj.store as Record<string, unknown> }
  }

  // Shape 2 — TLEditorSnapshot: the real document lives one level down, under `.document`.
  if (obj.document && typeof obj.document === 'object') {
    const doc = obj.document as Record<string, unknown>
    if (doc.store && typeof doc.store === 'object') {
      return { schema: doc.schema, store: doc.store as Record<string, unknown> }
    }
    return null
  }

  // Shape 3 — RoomSnapshot: reconstruct the store map from `documents[].state`, exactly the way
  // `@tldraw/sync-core`'s own `TLSocketRoom.updateStore` reduces its own `getCurrentSnapshot()`
  // output (`node_modules/@tldraw/sync-core/dist-cjs/lib/TLSocketRoom.js:578`,
  // `Object.fromEntries(this.getCurrentSnapshot().documents.map((d) => [d.state.id, d.state]))`)
  // — not a guess at the format, the library's own idiom for reading it back.
  if (Array.isArray(obj.documents)) {
    const store: Record<string, unknown> = {}
    for (const doc of obj.documents) {
      if (!doc || typeof doc !== 'object') continue
      const state = (doc as { state?: unknown }).state
      if (!state || typeof state !== 'object') continue
      const id = (state as { id?: unknown }).id
      if (typeof id !== 'string') continue
      store[id] = state
    }
    return { schema: obj.schema, store }
  }

  return null
}
