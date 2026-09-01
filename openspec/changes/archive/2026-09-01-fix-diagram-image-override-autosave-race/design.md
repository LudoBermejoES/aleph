# Design

## D1 — Which of the four links actually broke, checked in order

The task that reported this defect named four places the break could be, in this order, and said
to check the whole chain because the break might not be where it looks. It wasn't.

1. **The popover emits `selectImage`** (`EntityPopover.vue:~197`). Read, unchanged: the contract
   is `[shapeId, imageId, imageUrl]` and it fires correctly.
2. **The diagram page owns the editor and writes the shape** (`[diagramId].vue`). This is where
   the break is — see D2.
3. **Is the override persisted server-side?** `snapshot.put.ts` stores whatever JSON body it
   receives with no schema validation (`readBody` → `JSON.stringify` → insert), so nothing there
   strips or rejects `imageOverrideId`. Confirmed by reading the endpoint, and confirmed again by
   the repro below: when the client actually sends the override, the server keeps it byte for
   byte.
4. **Hydration on load** (`diagram-hydration.ts`). Already correct: `resolveShapeImageUrl` (added
   by `add-per-shape-diagram-image`) resolves the override against the entity's gallery and only
   falls back to the primary when the override is absent or unresolvable. Its own unit suite
   (`tests/unit/utils/diagram-image-override.test.ts`) mocks `fetch` directly and asserts the rule
   as a pure function — that test is sound and stayed green throughout this investigation, which
   is itself evidence hydration was never the problem this time.

So the break is in link 2, and it is not that the write is wrong — it's that the write's arrival
at the server is racing a full-page navigation the user was always going to trigger sooner or
later, because nothing told them not to.

## D2 — Two things that look like fixes and are not, ruled out by measurement

**"`updateShapes` triggers the store listener synchronously, so `saveNow()` (which reads
`lastSnapshot`) is enough."** This was the first attempt and it does not work. Measured with a
`console.log` immediately after `editor.updateShapes(...)`: `lastSnapshot` is non-null (truthy)
at that point, but it is the _pre-pick_ snapshot — `TldrawWrapper.tsx`'s
`store.listen(..., { scope: 'document', source: 'user' })` callback that assigns a fresh
`lastSnapshot` fires **after** `onPopoverSelectImage` has already returned, not inside the same
synchronous call. Calling `saveNow()` right after `updateShapes` therefore persists the shape's
state _before_ the pick, every time — verified against a real dev server: the PUT request
completed successfully (network trace shows 200), and the persisted `imageOverrideId` was `null`
regardless. A fix that "worked" by every naive check (no errors, request succeeds, `saveStatus`
flips to "saved") and still shipped the exact bug is the same family this project has hit before
under "a test that stays green against the original bug" — here it would have been a _fix_ that
stays broken against the original bug, an easy thing to miss without reading back what was
actually persisted rather than trusting that a request was sent.

**Reading the store directly instead.** `getSnapshot(store)`, exported by `tldraw` itself
(`@tldraw/editor`'s `TLEditorSnapshot.js`), is a pure, synchronous reader:
`store.getStoreSnapshot()` plus the current session-state signal, no batching, no listener. Calling
it directly on `(editor as { store }).store` right after `updateShapes` returns the state
_including_ the pick, verified the same way: the persisted `imageOverrideId` matched the chosen
image immediately after the click, with no wait, no manual save, and a hard reload right after
still showed the chosen image and the correct reset-button/marked-thumbnail state on reopening the
popover.

## D3 — Why multiplayer/sync mode does not have this race — CORRECTED, see D6

> **This section's premise is false and is kept, not deleted, because the correction (D6) is the
> more important lesson: "sync mode is off in production" was never checked against the live
> server, and it was wrong.** Production's `.env` carries `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true`
> (read directly off `/var/www/aleph/.env` over SSH, 2026-09-01) — the opposite of what the next
> paragraph assumes. The mechanism described below (the room applies changes independent of page
> lifetime, a reconnecting client rejoins the live room) is still accurate on its own terms; it
> just was never reached, because a DIFFERENT defect (D6) rejected the write before any of this
> logic ran.

In sync mode (`NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true`, off by default and not enabled in
production per the deploy env), `onPopoverSelectImage`'s `updateShapes` call goes over the
`@tldraw/sync` websocket into the server's `TLSocketRoom` (`server/services/tldraw-rooms.ts`).
That room applies the change to its own in-memory document immediately — independent of the
client's page lifetime — and schedules its own debounced persist (`PERSIST_DEBOUNCE_MS = 2000`,
`MAX_PERSIST_MS = 10000`) purely to batch DB writes, not to decide whether the change survives. A
client refreshing or closing the tab does not undo anything: the room already has the new state
and will flush it to `diagram_snapshots` within its own window regardless, and a reconnecting
client rejoins the same live room rather than reading a stale row. So the fix is scoped to REST
(single-user, the default and what production runs) mode only; `onPopoverSelectImage` still checks
`multiplayerActive.value` first and does nothing extra in sync mode, exactly as before.

## D4 — Investigated and ruled out: the server-side shape schema gap — WRONG, fixed in D6

> **"Not the cause of the reported defect" below is false, and it is the exact defect the user
> re-reported after this change had already deployed.** D4 correctly FOUND the gap and incorrectly
> judged it out of scope on the strength of D3's unverified premise. See D6.

While tracing this, `server/services/tldraw-shape-schemas.ts` (the server-side duplicate of the
client `RecordProps` validators, used only by `TLSocketRoom` in sync mode) was found to be missing
`imageOverrideId` on every shape that carries it — a real gap, `T.object`'s default
`shouldAllowUnknownProperties = false` means a sync-mode client sending that prop would have its
whole `props` validation throw. Not touched here: per D3, sync mode is off in production, so it is
not the cause of the reported defect, and the file showed signs of concurrent, unrelated edits
(an `aspectRatio` prop appearing mid-investigation) — the safer thing is to name the gap rather
than reach into a file mid-flight from another line of work. Worth its own small follow-up change
if diagram multiplayer is ever turned on.

## D6 — The real production defect: sync mode IS on, the schema gap IS the cause, plus a second, independent gap that made it silent

**D3's premise was never checked against the live server.** `ssh` onto
`/var/www/aleph/.env` shows `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true`. That flag only gates whether
the BROWSER opens a sync socket (`[diagramId].vue`'s `syncUri` computed) — the server's
`/api/tldraw-sync/[diagramId]` websocket route and the `TLSocketRoom` behind it are always live
regardless, so the D4 gap was reachable in production the whole time this change believed it
wasn't.

**Measured, not inferred.** `/var/www/aleph/logs/pm2-error.log` carries 20 occurrences (07:01–08:49
on 2026-09-01) of:

```
Error in transaction TLSyncError: At shape(type = locationPin).props.imageOverrideId: Unexpected property
    at diffAndValidateRecord (@tldraw/sync-core/dist-esm/lib/recordDiff.mjs:9:11)
    ...
  reason: 'INVALID_RECORD'
```

— both BEFORE and AFTER this change's autosave-race fix deployed at 08:08, i.e. a second,
independent defect from the one this change fixed, on the exact prop D4 had already found and
named. This is exactly what the user re-reported after the deploy: "sigue dando lo mismo".

**Fix 1 — the schema gap D4 found.** Added `imageOverrideId: T.optional(T.string)` to the four
shapes that actually carry the prop client-side (enumerated from
`app/components/diagrams/react/shapes/*.tsx`, not from memory): `npcToken`, `locationPin`,
`factionCard`, `entityCard`. `aspectRatio` (the prop D4 flagged as a possible sibling gap, added by
concurrent work) was checked the same way and was already correctly declared on all four — no fix
needed there, verified by a test rather than assumed.

**Fix 2 — an independent gap this investigation found, not previously known.** `wrapPeer` in
`server/routes/api/tldraw-sync/[diagramId].ts` builds an object typed as `WebSocketMinimal` but
never implements `close()` — a REQUIRED member of that interface (confirmed with
`tsc -p .nuxt/tsconfig.server.json`: `TS2741: Property 'close' is missing`, which this repo never
runs in CI — only eslint + vitest — so the error was invisible). `TLSyncRoom.removeSession` calls
`session.socket.close(code, reason)` on every fatal rejection, wrapped in a bare `try {} catch {}`.
With no `close` method the call threw and was silently swallowed: the room forgot the session
internally, but the real WebSocket to the browser stayed open — no close event, no error frame,
nothing for `useSync`'s status to react to. That made Fix 1's absence SILENT rather than merely
broken: `multiplayerActive` and the "conectado" indicator kept reading true, `onCanvasChange`'s
`if (multiplayerActive.value) return` kept suppressing the REST fallback, and every future push
from that tab went nowhere with zero user-visible sign — the only way anyone found out was
reloading, which is exactly the reported symptom. Fixed by delegating to the real
`peer.close(code, reason)`.

**Why the archived e2e suite (`tests/e2e/diagram-image-override.spec.ts`, including this change's
own 3.8) never caught either gap.** `playwright.config.ts`'s `webServer` runs `npx nuxt dev` with
whatever `.env` is on disk, and this repo's local `.env` sets
`NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false` — so the WHOLE e2e suite for this feature has only ever
exercised the REST path, never the sync path production actually runs. This is a gap in the TEST
ENVIRONMENT, not in the tests' logic: a green 3.8 proved the REST fix and proved nothing about sync
mode, and nothing in this project's Playwright config makes that visible without reading `.env` on
both sides side by side.

**New coverage, at the level that IS gated in this repo's CI** (`deploy: needs: [test,
integration-test]`; the e2e suite is never invoked by `.github/workflows/deploy.yml` at all):

- `tests/unit/server/tldraw-shape-schemas.test.ts` — table-driven against the REAL
  `alephTLSchema` object: all four shapes accept `imageOverrideId` (and reject it when absent, a
  positive control), plus two negative controls (`questNode`, `genealogyNode`) that must keep
  rejecting it. Mutation-tested: reverting Fix 1 turns exactly the 4 "accepts" cases red.
- `tests/integration/tldraw-sync-image-override.test.ts` — drives the REAL
  `/api/tldraw-sync/[diagramId]` websocket route with the real `@tldraw/sync-core` wire protocol
  (`connect`/`push`, `getTlsyncProtocolVersion()`, `alephTLSchema.serialize()`) against a live dev
  server, no browser. Covers: all four shapes accept the override without the session being
  rejected; the `questNode` negative control is REJECTED and the socket ACTUALLY CLOSES (code
  4099, `INVALID_RECORD`) — the permanent regression test for Fix 2, mutation-tested by reverting
  it (the same push then hangs to a timeout instead of closing); and the override survives what a
  real reload does in multiplayer mode — a second, independent connection to the same room reading
  the value back from the `connect` ack's initial diff (deliberately NOT the REST `GET .../snapshot`
  endpoint, which was found mid-investigation to store a format `TLSocketRoom.getCurrentSnapshot()`
  returns — `RoomSnapshot`, `{documents, tombstones, ...}` — that the REST endpoint's
  `filterSnapshotByVisibility` does not recognise (`{store, schema}` expected). Named here as a
  found-but-NOT-fixed third issue: harmless for the actual browser UI, because
  `TldrawWrapperSync` never reads the REST snapshot once `syncUri` is set, but a real gap for any
  OTHER consumer of that endpoint (CLI, export) reading a diagram that has ever been opened in sync
  mode. Worth its own follow-up change.

## D5 — Not a debounce-length fix

Raising the debounce, or adding a `beforeunload` flush, would still leave a window and would not
fix the deeper problem: a discrete, popover-confirmed choice was being treated as part of a stream
of continuous edits it is not part of. Flushing immediately removes the window instead of shrinking
it, and matches how the app already treats other one-shot writes (e.g. the manual "Guardar"
button calls the same `saveNow()` this change effectively calls automatically for this one action).
