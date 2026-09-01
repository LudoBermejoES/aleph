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

## D3 — Why multiplayer/sync mode does not have this race

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

## D4 — Investigated and ruled out: the server-side shape schema gap

While tracing this, `server/services/tldraw-shape-schemas.ts` (the server-side duplicate of the
client `RecordProps` validators, used only by `TLSocketRoom` in sync mode) was found to be missing
`imageOverrideId` on every shape that carries it — a real gap, `T.object`'s default
`shouldAllowUnknownProperties = false` means a sync-mode client sending that prop would have its
whole `props` validation throw. Not touched here: per D3, sync mode is off in production, so it is
not the cause of the reported defect, and the file showed signs of concurrent, unrelated edits
(an `aspectRatio` prop appearing mid-investigation) — the safer thing is to name the gap rather
than reach into a file mid-flight from another line of work. Worth its own small follow-up change
if diagram multiplayer is ever turned on.

## D5 — Not a debounce-length fix

Raising the debounce, or adding a `beforeunload` flush, would still leave a window and would not
fix the deeper problem: a discrete, popover-confirmed choice was being treated as part of a stream
of continuous edits it is not part of. Flushing immediately removes the window instead of shrinking
it, and matches how the app already treats other one-shot writes (e.g. the manual "Guardar"
button calls the same `saveNow()` this change effectively calls automatically for this one action).
