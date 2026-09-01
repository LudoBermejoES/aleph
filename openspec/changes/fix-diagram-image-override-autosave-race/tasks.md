## 1. Reproduce before touching anything

- [x] 1.1 Reproduce in a real browser (Playwright, headless, against a manually started
      `STARTUP_BACKFILLS_ENABLED=false npm run dev` on :3333, not the automated suite's harness):
      seed a Location entity with two gallery images, place it on a diagram, pick the non-primary
      image in the popover, reload immediately with no manual save and no wait. Confirm the card
      reverts to the primary and the persisted snapshot's `imageOverrideId` is `undefined`.
- [x] 1.2 Confirm the popover-state detail from the report: before the reload the "use the main
      image" reset button is visible; after it, with the two thumbnails still present, it is gone
      — because there is genuinely no override stored, not because of a rendering bug.
- [x] 1.3 Confirm the control case: waiting ~2.5s (longer than the existing 1s debounce) before
      reloading, with still no manual save click, persists correctly. This isolates the defect to
      timing, not to hydration or the server.
- [x] 1.4 Walk the whole chain named in the task before concluding where the break is: popover
      emit (fine), the page's write (broken — see 1.1), server persistence with no schema
      stripping (fine, confirmed by reading `snapshot.put.ts`), hydration (fine, confirmed by the
      existing pure-function unit suite staying green throughout). Recorded in design.md D1.

## 2. Read the archived tests that claimed this was already covered

- [x] 2.1 Read `tests/e2e/diagram-image-override.spec.ts` in full. Confirm every reload-after-pick
      assertion is preceded by an explicit `saveDiagramNow()` call — a deliberate choice to flush
      the debounce for test reliability, not a red flag by itself, but it means no scenario ever
      exercised "a real user just picks and refreshes".
- [x] 2.2 Read `tests/unit/utils/diagram-image-override.test.ts` and confirm it tests the
      resolution RULE as a pure function against a mocked `fetch`, independent of the autosave
      path — correctly written from the rule, not the implementation, and not the source of the
      gap.

## 3. The fix

- [x] 3.1 `onPopoverSelectImage` (`app/pages/campaigns/[id]/diagrams/[diagramId].vue`): after
      `updateShapes`, flush the write immediately in REST mode instead of leaving it to the
      generic debounce.
- [x] 3.2 First attempt, measured to NOT work and recorded rather than silently discarded: calling
      `saveNow()` (which reads `lastSnapshot`) directly after `updateShapes`. Verified with a
      `console.log` that `lastSnapshot` is non-null but stale (pre-pick) at that point, because
      `TldrawWrapper`'s `store.listen` callback that refreshes it is not synchronous with
      `updateShapes`. See design.md D2.
- [x] 3.3 Working fix: read the store directly with tldraw's own `getSnapshot(store)` (a pure,
      synchronous reader, dynamically imported from `'tldraw'`), assign it to `lastSnapshot`,
      cancel any pending debounce timer, and `autoSave` it directly. Re-ran the same browser repro
      from task 1: persisted `imageOverrideId` correct immediately after the click, correct after
      an immediate reload with no save and no wait, and the reopened popover both shows the reset
      control and marks the correct thumbnail. Verified across 3 consecutive runs, not once.
- [x] 3.4 Confirm no change needed in multiplayer/sync mode: `onPopoverSelectImage` already
      branches on `multiplayerActive.value` and does nothing extra there. Read
      `server/services/tldraw-rooms.ts` to confirm the sync room persists independently of the
      client's page lifetime, so the race does not exist on that path. Recorded in design.md D3.
- [x] 3.5 Investigated and explicitly NOT fixed here: `server/services/tldraw-shape-schemas.ts`
      (the server-side sync-mode shape schema) is missing `imageOverrideId` on every shape that
      carries it, which would reject the prop if multiplayer mode were ever turned on. Out of
      scope because sync mode is off in production (D3) and the file showed signs of concurrent,
      unrelated edits from other work in progress. Named as a follow-up in design.md D4, not
      silently left for someone to rediscover.

## 4. Automated regression coverage

- [x] 4.1 New e2e scenario in `tests/e2e/diagram-image-override.spec.ts`: pick the non-primary
      image and reload **without** calling `saveDiagramNow()` and with no artificial wait longer
      than the UI interaction itself takes. Assert the reloaded card shows the chosen image and
      the reopened popover shows the reset control. Mutation-checked: reverting the fix in 3.3
      turns this red (confirmed by re-running against the pre-fix code).
- [x] 4.2 Existing e2e suite (`diagram-image-override.spec.ts`, all scenarios) still green with
      the fix applied — the flush added here must not break the already-passing
      `saveDiagramNow()`-first scenarios.
- [x] 4.3 Existing unit suite (`tests/unit/utils/diagram-image-override.test.ts`,
      `tests/unit/components/*.test.ts`) unaffected and still green — this fix does not touch the
      resolution rule or the popover component, only when the write is flushed.

## 5. Before calling this done

- [x] 5.1 `npm run format:check` run and read, not just eslint.
- [x] 5.2 `openspec validate fix-diagram-image-override-autosave-race --strict` green.
- [x] 5.3 Full suites reported with real numbers (unit, integration, e2e for the touched spec),
      not assumed from a partial run.

## 6. The user re-reported the SAME symptom after this deployed — D4's "out of scope" was wrong

The user verified in production, with the autosave-race fix already live, that picking a
non-primary image and reloading still lost the choice. See design.md D6 for the full record;
summarized here as tasks.

- [x] 6.1 Verify D3's premise (sync mode off in production) against the LIVE server instead of
      trusting it. `ssh` onto `/var/www/aleph/.env`: `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true`. The
      premise was false and unverified when D3/D4 were written.
- [x] 6.2 Confirm the schema gap D4 found is live and firing in production, not theoretical: read
      `/var/www/aleph/logs/pm2-error.log`. 20 occurrences of
      `TLSyncError ... props.imageOverrideId: Unexpected property`, `reason: 'INVALID_RECORD'`,
      07:01–08:49 on 2026-09-01 — both before AND after the autosave-race fix deployed at 08:08.
- [x] 6.3 Fix 1: add `imageOverrideId: T.optional(T.string)` to the four shapes that actually carry
      it in `server/services/tldraw-shape-schemas.ts` (`npcToken`, `locationPin`, `factionCard`,
      `entityCard` — enumerated from the client shape files, not memory). Checked `aspectRatio` for
      the same gap on the same four shapes: already correct, verified by a test.
- [x] 6.4 Found, not previously known: a SECOND, independent gap that made 6.3's absence silent.
      `wrapPeer` (`server/routes/api/tldraw-sync/[diagramId].ts`) is typed `WebSocketMinimal` but
      never implements the interface's REQUIRED `close()` method — confirmed with
      `tsc -p .nuxt/tsconfig.server.json` (`TS2741`, gone after the fix; this repo runs no
      typecheck in CI). `TLSyncRoom.removeSession`'s `session.socket.close(...)` call therefore
      threw and was swallowed by its own `try {} catch {}` on every fatal rejection, leaving the
      browser's WebSocket open with no close event — the "conectado" indicator never flipped, so
      the user had zero indication their edit had failed. Fixed by delegating to
      `peer.close(code, reason)`.
- [x] 6.5 Identify why the archived e2e suite's own 3.8 (task 4.1) never caught either gap:
      `playwright.config.ts`'s `webServer` inherits `.env`, and this repo's local `.env` sets
      `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false` — so the WHOLE suite for this feature has only ever
      exercised the REST path. A gap in the TEST ENVIRONMENT, not the tests' logic.
- [x] 6.6 New unit coverage against the REAL schema object, not a re-implementation:
      `tests/unit/server/tldraw-shape-schemas.test.ts` gains `imageOverrideId`/`aspectRatio`
      describe blocks (positive cases for all four shapes, negative controls on `questNode` and
      `genealogyNode`). Mutation-tested: reverting 6.3 turns exactly the 4 "accepts" cases red
      (confirmed by re-running against the pre-fix schema file).
- [x] 6.7 New integration coverage at the level this repo's CI actually gates
      (`deploy: needs: [test, integration-test]`; e2e is never invoked by
      `.github/workflows/deploy.yml`): `tests/integration/tldraw-sync-image-override.test.ts`
      drives the real `/api/tldraw-sync/[diagramId]` websocket route with the real
      `@tldraw/sync-core` wire protocol against a live dev server. Covers all four shapes
      accepting the override, the `questNode` negative control being rejected AND observably
      closing the socket (code 4099, `INVALID_RECORD` — the regression test for 6.4, mutation
      confirmed: reverting 6.4 turns this into a silent timeout instead), and the override
      surviving a second, independent connection to the same room (the sync-mode equivalent of a
      reload) reading the `connect` ack's initial diff.
- [x] 6.8 Found and named, NOT fixed (separate, pre-existing, and does not affect the browser UI):
      `TLSocketRoom.getCurrentSnapshot()` persists in `RoomSnapshot` format
      (`{documents, tombstones, ...}`), which `GET .../snapshot`'s `filterSnapshotByVisibility`
      does not recognise (`{store, schema}` expected) — harmless today because
      `TldrawWrapperSync` never reads that REST endpoint once `syncUri` is set, but a real gap for
      any other consumer (CLI, export) of a diagram that has ever been opened in sync mode. See
      design.md D6's closing paragraph. Worth its own follow-up change.
- [x] 6.9 Full suites re-run and reported after 6.3/6.4: `npx vitest run tests/unit/` — 165 files /
      2200 tests green. `tests/integration/tldraw-sync-image-override.test.ts` — 6/6 green on a
      freshly-restarted dev server (this file is sensitive to the dev server having survived many
      hot-reloads in one process — see design.md D6's note on that flakiness class, unrelated to
      this fix). Full `tests/integration/` — 112–113/115 files green depending on run; the 2–3
      failures (`admin-users.test.ts`, `backup-api.test.ts`, intermittently
      `rate-limiting.test.ts`) are pre-existing and reproduce identically with 6.3/6.4 reverted,
      confirmed by re-running them against the unmodified files.
- [x] 6.10 `npm run format:check` and `npx eslint` clean on every touched/added file.
