# Design

## D1 — Measuring the defect, not reading it off the old design.md

The archived `fix-diagram-image-override-autosave-race`'s design.md (D6, last paragraph) _named_
this gap but did not measure what the endpoint actually returns. Before writing any fix, this
change reproduced it against a real dev server (`STARTUP_BACKFILLS_ENABLED=false`, throwaway DB),
using the same wire-protocol technique as `tests/integration/tldraw-sync-image-override.test.ts`
(a real `@tldraw/sync-core` client — `connect`/`push` — against the real
`/api/tldraw-sync/:diagramId` route, no browser):

1. `GET .../snapshot` on a brand-new diagram with no snapshot at all → `404 "No snapshot found"`
   (expected, unaffected by this change).
2. Push one `npcToken` shape over the real sync websocket, wait 3.5s (past the room's 2000ms
   persist debounce), then `GET .../snapshot` → **`200`**, body:
   ```json
   {
     "snapshot": {
       "tombstoneHistoryStartsAtClock": 0,
       "documentClock": 1,
       "documents": [ { "state": { "id": "document:document", ... }, "lastChangedClock": 0 },
                       { "state": { "id": "page:page", ... }, "lastChangedClock": 0 },
                       { "state": { "id": "shape:probe-npc-1", "props": {...}, ... },
                         "lastChangedClock": 1 } ],
       "tombstones": {},
       "schema": { "schemaVersion": 2, "sequences": {...} }
     },
     "version": 1
   }
   ```
   `'store' in snapshot` is `false`; `'documents' in snapshot` is `true`. This is the "plausible,
   non-empty, wrong" shape named in the task, not a crash and not an empty body — a naive consumer
   reading `snapshot.store['shape:...']` gets `undefined` and, worse, `filterSnapshotByVisibility`
   treats the missing `.store` as "nothing to filter" and returns the object **unfiltered**.

## D2 — How many production diagrams are already in this state

Read directly off `/var/www/aleph/data/aleph.db` over SSH, read-only (`new Database(path, {
readonly: true, fileMustExist: true })`, the app's own `better-sqlite3`, no write, no server
restart): for each diagram's **latest** snapshot row (the one the GET endpoint actually reads —
`ORDER BY version DESC LIMIT 1`), classify by shape:

| shape                                                                                                          | count |
| -------------------------------------------------------------------------------------------------------------- | ----- |
| `RoomSnapshot` (`Array.isArray(.documents)`) — what sync persists, unreadable by the old GET logic             | **8** |
| `TLEditorSnapshot` (`.document` is an object) — what the REST-mode browser's `getSnapshot(editor.store)` sends | 1     |
| `TLStoreSnapshot` (`.store` is an object) — `toTldrawSnapshot`'s own generation-time output                    | 0     |
| unrecognized / parse error                                                                                     | 0     |

10 diagrams total, 9 with at least one snapshot. **8 of 9** are already affected — this is not an
edge case reachable only in theory; it is the majority shape in the live database, because once a
diagram is opened with sync enabled its very next persist overwrites the row in the room's format
regardless of how the row started.

## D3 — Who actually reads the GET response today

Checked in code, not assumed:

- `app/pages/campaigns/[id]/diagrams/[diagramId].vue` fetches it unconditionally on load
  (`loadDiagram`), but only feeds the result to the canvas via
  `:snapshot="multiplayerEnabled ? undefined : snapshot"` — `multiplayerEnabled` is the **static**
  `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` runtime-config flag, not the live connection state, so in
  production the fetched value is _always_ discarded by the canvas regardless of whether the socket
  actually connects. This is why nothing renders visibly wrong today.
- `cli/src/commands/diagram.js` — no `snapshot` subcommand exists (`list`, `create`, `delete`,
  `generate` only). Grepped `cli/`, `app/`, `server/` for `/snapshot` outside test files: zero other
  hits.
- So the _only_ thing that actually consumes the unfiltered body today is whatever reads the raw
  HTTP response — which is exactly the visibility-bypass in D4, not a rendering bug.

## D4 — The security-relevant half of this: visibility filtering is currently bypassed for 8/9 diagrams

`filterSnapshotByVisibility`'s own comment defends `if (!store) return snapshot` as "an
empty/malformed save... return it unchanged rather than crashing". That reasoning does not extend
to `RoomSnapshot`: it is not malformed, it is a different _valid_, densely-populated shape the
function has never been taught to read. The practical effect for all 8 production diagrams already
in this state: a DM could set a character to `dm_only` after generating/editing a diagram in sync
mode, and a player fetching that diagram's snapshot would receive that character's shape (full
props, including `entityId`) in the response body, unfiltered — the exact scenario
`relationship-graph`'s spec already requires to be excluded
("Viewing a previously-generated diagram still excludes entities the viewer cannot see"), just
never exercised against this stored shape. The UI not rendering it does not mean it was not sent.

## D5 — The fix: normalize on read, not on write

Three shapes exist in the wild; two write paths currently produce them; either read-time or
write-time normalization closes the reachable-format gap, but the costs differ:

**Read-time (chosen).** Add one pure function,
`normalizeStoredSnapshot(raw): {schema, store} | null`, recognizing all three shapes (a fourth,
unrecognized case returns `null` and the caller falls back to the pre-existing behavior — passing
the raw value through to `filterSnapshotByVisibility`, which still defends itself against a missing
`.store`). Call it once, in `snapshot.get.ts`, before filtering.

- Fixes **all 8** already-affected production rows immediately, with **zero writes** to any
  existing row and no migration script to get wrong.
- Touches exactly one read path. The two write paths (`snapshot.put.ts`,
  `tldraw-rooms.ts::writeSnapshotToDb`) are unchanged and keep doing what they already do correctly
  for their own consumers — the browser's REST autosave round-trips through the same shape it
  wrote, and `TLSocketRoom`'s own `initialSnapshot` parameter is typed `RoomSnapshot |
TLStoreSnapshot` (verified in `@tldraw/sync-core`'s own `.d.ts`) — it already accepts what it
  itself persists, no conversion needed on that side, which is exactly why `tldraw-rooms.ts`'s own
  `loadSnapshotFromDb` only ever needed to unwrap the REST `.document` case and never needed a
  `RoomSnapshot → TLStoreSnapshot` branch at all.
- Cost: every GET pays a small, pure, in-memory conversion. At the sizes this table already
  operates under (a 10MB `snapshot.put.ts` ceiling; the largest production row read during D2 was
  a handful of shapes), this is negligible next to the DB read and the existing filter pass.

**Write-time (considered, not adopted).** Converting `writeSnapshotToDb` (the sync room persist) to
store `{schema, store}` instead of the raw `RoomSnapshot` would make every _future_ row uniform and
let `snapshot.get.ts` stay unchanged. Rejected for now:

- It does **nothing** for the 8 rows already in the database — read-time normalization is required
  regardless, so adding write-time normalization on top is strictly additional surface for the same
  outcome, not a replacement for it.
- It touches the exact file this change is deliberately avoiding rewriting: `tldraw-rooms.ts` is the
  live production persistence path for every active diagram room, mid-flight from two other recent
  changes to the same area (`fix-diagram-image-override-autosave-race`'s Fix 1/Fix 2). Changing what
  it writes changes what `loadSnapshotFromDb` must read back on the next `getOrCreateRoom`, which is
  exactly the kind of write-path coupling that turned one gap into two independent defects last
  time. A narrower, read-only fix has a strictly smaller blast radius for the same measured problem.
- If sync-mode multiplayer is ever extended (the `design.md` of the previous change already flagged
  this general area as "worth its own small follow-up"), converging the write format is worth
  revisiting on its own — but it is not required to close _this_ defect.

## D6 — Test environment: this defect is invisible to the existing Playwright config, and was almost invisible to this change's own first draft of tests too

Same root cause as `fix-diagram-image-override-autosave-race`'s D6: `playwright.config.ts`'s
`webServer` runs `npx nuxt dev` inheriting whatever `.env` is on disk, and this repo's local `.env`
has `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false`. A Playwright suite that only drives the browser UI
would never cause a `RoomSnapshot` to be persisted at all, so it could not exercise this code path
by construction, no matter how the assertions are written.

Two consequences for how this is tested:

1. Primary coverage is a Vitest integration test (`tests/integration/`, gated by this repo's CI —
   `deploy: needs: [test, integration-test]`) that talks to the real
   `/api/tldraw-sync/:diagramId` websocket directly, exactly like
   `tests/integration/tldraw-sync-image-override.test.ts` — the sync route itself does **not**
   check the `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` flag (confirmed by reading the route: the flag only
   gates whether `[diagramId].vue`'s `syncUri` computed opens a socket in the browser), so this
   route is reachable regardless of `.env`, with no server config changes required.
2. One Playwright scenario is still added, because the D4 visibility bypass is a genuinely
   browser-observable difference (a network response body a member's browser receives) — but it
   launches a dedicated dev server with `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true` explicitly set,
   rather than depending on `playwright.config.ts`'s shared server, so it is not silently skipped
   by the same environment gap that hid this from `fix-diagram-image-override-autosave-race`'s own
   suite. See tasks.md for how it is started/torn down.

## D7 — Guarding against "a test that asserts the bug" here specifically

The obvious wrong test to write is one that pins whatever the _old_ code already returns for a
`RoomSnapshot` input (i.e. asserts `store` is `undefined` and the object still has `.documents`) —
that would be exactly the tenth instance of this project's most repeated defect. Every test added
here instead asserts the **rule**: given any of the three known persisted shapes, `GET .../snapshot`
must return `{schema, store}` with the _specific_ shape ids/props that were written recoverable by
id — sourced from what was actually pushed/PUT in the test setup, not from a literal captured from
a debug run. The negative/visibility scenario asserts against the `relationship-graph` spec's own
already-declared rule ("a `dm_only` entity's shape must be excluded"), extended to a
`RoomSnapshot`-shaped stored row instead of the store-shaped one the existing tests already cover.

Mutation test for the new normalizer (tasks.md 3.x): comment out the `RoomSnapshot` branch (the one
handling `Array.isArray(raw.documents)`) and require the sync-format table case to go red; comment
out the `TLEditorSnapshot` branch (`raw.document`) and require that table case to go red
independently. Two branches, two independent mutations, so one cannot accidentally cover for the
other going missing.
