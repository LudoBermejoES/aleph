## Why

`fix-diagram-image-override-autosave-race` (archived 2026-09-01) named, investigated, and
deliberately left unfixed a gap in its own design.md (D6, final paragraph): the REST endpoint
`GET /api/campaigns/:id/diagrams/:diagramId/snapshot` assumes every stored `diagram_snapshots` row
is a `TLStoreSnapshot` (`{schema, store}`), but `TLSocketRoom.getCurrentSnapshot()` — what the
sync-mode room actually persists whenever `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` is on, which it is in
production — writes a different, incompatible shape (`RoomSnapshot`:
`{documents: [{state, lastChangedClock}], tombstones, schema, ...}`). That design.md judged the gap
harmless because "sync mode is off in production", a premise it corrected in the same document
after finding it was never actually checked against the live `.env` — it is `true`.

**Measured today, not inferred.** A script pushed one shape over the real
`/api/tldraw-sync/:diagramId` websocket (the same production path), waited past the room's 2s
persist debounce, then called the REST GET endpoint: it answers **HTTP 200** with a JSON body
shaped like `{tombstoneHistoryStartsAtClock, documentClock, documents: [...], tombstones, schema}`
— not `{schema, store}`. This is the expensive shape of defect this project keeps naming: a
**plausible, non-empty, wrong** response, not a crash and not an empty one.

**And it is not a hypothetical edge case.** Read directly off production's `data/aleph.db` over
SSH (read-only, `better-sqlite3` with `{readonly: true}`, no write): of **10** diagrams, **9** have
at least one persisted snapshot, and of those, **8 are already in the `RoomSnapshot` format** the
REST GET cannot parse. Only 1 is in the REST-autosave shape. Zero are in the original
generation-time shape (`toTldrawSnapshot`'s own output) — once a diagram is opened with sync
enabled, its next persist overwrites the row in the room's own format regardless of how it started.

**There is a second, more serious consequence than "wrong shape" for a future consumer.** The GET
handler's own entity-visibility filter, `filterSnapshotByVisibility`
(`server/utils/diagram-generator.ts`), silently no-ops when `snapshot.store` is `undefined` — a
deliberate defensive choice, by its own comment, for a genuinely malformed save. But a
`RoomSnapshot` is not malformed, it is a DIFFERENT VALID shape the filter's `if (!store) return
snapshot` cannot tell apart from garbage — so for all 8 of those production diagrams, the
`relationship-graph` spec's "Graph and diagram nodes respect entity visibility" requirement is
**not enforced at all**: a `dm_only` character's shape is not stripped, and the full unfiltered
`RoomSnapshot` (including every entity ID and prop) goes out in the HTTP response body to any
member who can view the diagram, whatever their role. The current diagram-editor page happens not
to render that response's contents when sync mode is active (it forces the tldraw `snapshot` prop
to `undefined` in that case), so nothing is visibly broken in the browser today — but the data
still leaves the server unfiltered, in the network response, to anyone reading it.

**Who consumes this endpoint today, checked in the code, not assumed:** the diagram editor page
(`app/pages/campaigns/[id]/diagrams/[diagramId].vue`), which discards the value whenever sync mode
is statically enabled, and this repo's own test suites. No CLI command reads or writes it
(`cli/src/commands/diagram.js` has `list`/`create`/`delete`/`generate` only — no `snapshot`
subcommand at all) and no export path touches it. So today the practical blast radius is the
visibility-filtering bypass above, not a broken UI — but the endpoint is documented, public, and
exactly the kind of thing a future CLI command or export feature would reach for, at which point it
would silently receive the wrong shape.

## What Changes

- Add a pure, dependency-free normalizer that recognizes all three shapes ever persisted into
  `diagram_snapshots` (`TLStoreSnapshot`, the REST client's `TLEditorSnapshot`, and sync's
  `RoomSnapshot`) and converts each to the one canonical `{schema, store}` shape.
- Apply it in `GET .../snapshot` **before** `filterSnapshotByVisibility` runs, so entity-visibility
  filtering is restored for every already-persisted diagram, with no data migration and no write to
  any existing row.
- No change to either write path (`snapshot.put.ts`, `tldraw-rooms.ts`'s room persist): they already
  work correctly for their own consumers (the browser's REST autosave, and `TLSocketRoom` itself,
  which accepts `RoomSnapshot | TLStoreSnapshot` natively as `initialSnapshot`). See design.md for
  why write-side normalization was considered and not adopted here.

## Impact

- **Affected specs:** `relationship-graph` (extends the "Graph and diagram nodes respect entity
  visibility" requirement with sync-persisted-format scenarios).
- **Affected code:** new `server/utils/tldraw-snapshot-format.ts`;
  `server/api/campaigns/[id]/diagrams/[diagramId]/snapshot.get.ts`.
- **aleph-cli:** no impact — no endpoint, auth flow, or data model changes; the CLI has no
  `diagram snapshot` command to update.
- **Test environment gap this change is written to survive:** `playwright.config.ts` starts its dev
  server from whatever `.env` is on disk, and this repo's local `.env` sets
  `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false` — so an e2e-only regression test for this would never
  exercise the sync path production actually runs, exactly as happened to
  `fix-diagram-image-override-autosave-race`'s own e2e suite. Coverage here is added at the
  Vitest integration level (gated by this repo's CI, `deploy: needs: [test, integration-test]`)
  against the real `/api/tldraw-sync/:diagramId` websocket route with sync mode genuinely
  exercised — the flag only gates the _browser_, not this route — plus one Playwright scenario that
  explicitly launches its own dev server with `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true` rather than
  relying on `playwright.config.ts`'s default, so it is not silently skipped over by the same gap.
