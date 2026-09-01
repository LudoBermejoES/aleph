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
