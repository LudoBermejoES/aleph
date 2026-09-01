## 1. Measure before touching anything

- [x] 1.1 Reproduce against a real dev server (throwaway DB, `STARTUP_BACKFILLS_ENABLED=false`):
      push a shape over the real `/api/tldraw-sync/:diagramId` websocket, wait past the room's
      2000ms persist debounce, call `GET .../snapshot`, and record the exact response shape.
      Recorded in design.md D1: `200` with `{documents, tombstones, schema, ...}`, `'store' in
snapshot` is `false`.
- [x] 1.2 Count how many production diagrams are already in this state — read-only, off
      `/var/www/aleph/data/aleph.db` over SSH via the app's own `better-sqlite3` with
      `{readonly: true}`, no write, no restart. Recorded in design.md D2: 8 of 9 snapshotted
      diagrams (10 total) are already in the sync-room format.
- [x] 1.3 Enumerate real consumers of `GET .../snapshot` from the code, not from memory: the
      diagram editor page (discards the value when sync mode is statically enabled) and the test
      suites; confirm `cli/src/commands/diagram.js` has no `snapshot` subcommand. Recorded in
      design.md D3.
- [x] 1.4 Name the consequence this actually has today given D3: `filterSnapshotByVisibility`
      silently no-ops on a `RoomSnapshot` (no top-level `.store`), so entity-visibility filtering
      is bypassed in the raw HTTP response for all of D2's affected rows, independent of whether
      the browser UI renders it. Recorded in design.md D4.

## 2. The normalizer

- [x] 2.1 Add `server/utils/tldraw-snapshot-format.ts`: pure function
      `normalizeStoredSnapshot(raw: unknown): { schema: unknown; store: Record<string, unknown> }
| null` recognizing, in order: `TLStoreSnapshot` (`.store` is an object → passthrough),
      `TLEditorSnapshot` (`.document` is an object → unwrap `.document.{schema,store}`),
      `RoomSnapshot` (`.documents` is an array → `Object.fromEntries(documents.map(d =>
[d.state.id, d.state]))`, the exact reduction `@tldraw/sync-core`'s own `TLSocketRoom`
      internals use on their own `getCurrentSnapshot()` output — cited by file:line in the
      function's own comment, not copied blind). Anything else → `null`.
- [x] 2.2 Unit test, table-driven, one case per real shape actually observed (D1's captured
      `RoomSnapshot`, an equivalent `TLEditorSnapshot`, and the plain generation-time
      `TLStoreSnapshot`) plus one unrecognized-input case asserting `null`: assert the specific
      shape/page/document ids and `props` written are recoverable from the normalized `.store` by
      id — not merely that the function "returns something".
- [x] 2.3 Mutation-test both real branches independently (design.md D7): comment out the
      `RoomSnapshot` branch, require only that table case to go red; restore it, comment out the
      `TLEditorSnapshot` branch, require only that table case to go red. Recorded in the final
      report, not left as an unexercised claim.

## 3. Wire it into the read path

- [x] 3.1 `snapshot.get.ts`: call `normalizeStoredSnapshot` on the parsed row; if it returns
      non-null, filter that; if `null` (unrecognized shape), pass the raw parsed value to
      `filterSnapshotByVisibility` unchanged, preserving today's defensive behavior for a
      genuinely malformed row.
- [x] 3.2 No change to `snapshot.put.ts` or `tldraw-rooms.ts` — see design.md D5 for why write-side
      normalization was considered and rejected for this change.

## 4. Regression coverage at the level this repo's CI actually gates

- [x] 4.1 New `tests/integration/diagram-snapshot-format.test.ts`: reuse the real
      `@tldraw/sync-core` wire-protocol helpers already proven in
      `tests/integration/tldraw-sync-image-override.test.ts` (`connect`/`push` against the real
      `/api/tldraw-sync/:diagramId` route — this route does not check
      `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER`, so no `.env` change is needed to reach it). Push a shape,
      wait past the persist debounce, `GET .../snapshot`, assert `200` + `store[id]` recoverable
      with the original `props` — the positive form of 1.1, now gated by `deploy: needs: [test,
integration-test]`.
- [x] 4.2 Extend the same file (or `tests/integration/diagram-api.test.ts`'s existing "Diagram
      snapshot — view-time visibility filtering" describe block) with the D4 scenario: seed a
      `dm_only` character, place its shape into a diagram via the real sync websocket (not a REST
      PUT — the whole point is exercising the format REST-only tests never touch), and assert a
      player's `GET .../snapshot` omits it while the DM's still includes it.
- [x] 4.3 Read design.md D6 before writing anything Playwright: the shared `playwright.config.ts`
      dev server inherits `.env`'s `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false` and cannot exercise this
      by construction. Confirm this by checking `.env` on disk, not by assuming it from the
      archived change's own note.
- [x] 4.4 Add one Playwright scenario in a dedicated spec file that starts its **own** dev server
      with `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true` (documented in the spec file itself: how it's
      launched, health-checked, and torn down, independent of `playwright.config.ts`'s
      `webServer`) — proves the fix at the level a real browser session experiences: two DM+player
      sessions, an edit made with sync active, and the player's page never receiving the hidden
      entity's data in its network response for the snapshot fetch.
- [x] 4.5 Run `npm run format:check` and read its output before considering this done — do not
      trust a green eslint run alone.

## 5. Archivado

- [x] 5.1 Esta tarea decía «no archivar» porque el despliegue era decisión de quien lanzó la
      sesión, no de aquella. Esa decisión ya se ha tomado: el dueño ordena archivar el 2026-09-01,
      y se archiva. Lo que hay que saber al leerlo después: el gate de este repo es real
      (`deploy: needs: [test, integration-test]`), así que la cobertura de la sección 4 sí bloquea
      un despliegue rojo; lo que NO se ha hecho en esta sesión es una comprobación contra el
      diagrama vivo de producción tras el despliegue. Se archiva IMPLEMENTADO Y GATEADO, no
      verificado en producción.
