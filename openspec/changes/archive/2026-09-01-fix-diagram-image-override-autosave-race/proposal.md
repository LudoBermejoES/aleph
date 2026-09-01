## Why

Reported in production on `berlin-en-tinieblas`: on the Location card "Donde apareció Theo", the
DM opened the popover, picked the second thumbnail, watched the card change immediately — and lost
the choice on the next reload. Before the reload, the popover offered a "Usar la imagen principal"
reset button; after it, the two thumbnails were still there but the reset button was gone.

The disappearing reset button is the tell. If hydration had simply reapplied the primary over a
correctly-saved override (the failure mode `add-per-shape-diagram-image` was written to fix), the
shape's `imageOverrideId` prop would still be sitting in the reloaded snapshot — the popover reads
it straight off the shape (`[diagramId].vue`'s `onAlephEntityPreview`) — and the reset button would
still show. It didn't, because there was genuinely nothing to reset: **the override was never sent
to the server before the reload happened.**

Reproduced against a real dev server with a real browser (Playwright, not a mock): pick a
non-primary image, read the diagram's persisted snapshot back over the API with no manual save and
no wait — `imageOverrideId` is `undefined`. Refresh in that state and the card is back on the
primary, exactly as reported. Wait ~2.5 s before refreshing (long enough for the existing 1-second
autosave debounce to fire on its own) and it persists correctly.

**Root cause:** `onPopoverSelectImage` (`app/pages/campaigns/[id]/diagrams/[diagramId].vue`) writes
the override to the shape with `editor.updateShapes(...)` and stops there. Persistence only happens
through the generic autosave path: `TldrawWrapper`'s `store.listen(...)` notices the store changed,
calls `onCanvasChange`, which sets `lastSnapshot` and (re)starts a **1000ms debounce** timer before
anything is sent to the server. That debounce exists to coalesce a stream of continuous edits
(dragging, resizing) into one request — it is the right default for those. A picker choice is not
one of those: it is one discrete, deliberate write, made through a popover that already told the
user "done" by changing the card on the spot. Nothing in the UI indicates a save is merely
_scheduled_ rather than _in flight_ — `saveStatus` stays `'idle'` for the whole debounce window — so
a user has no reason to wait, and a refresh inside that window silently discards the choice.

This is the "value accepted and silently does nothing" defect family this codebase has hit
repeatedly (`aleph character update` against a guessed slug, zod stripping unknown keys), one layer
down: here the value genuinely _was_ applied to the in-memory shape, and still amounted to nothing
the moment the tab reloaded.

**Why the archived change's own test suite never caught it:** every scenario in
`tests/e2e/diagram-image-override.spec.ts` that reloads after picking an image calls
`saveDiagramNow()` first — a deliberate, documented choice to flush the debounce for test
reliability rather than sleep through it. That is a reasonable thing to do in a test. Nobody wrote
the _other_ scenario: a real user does not know a manual "Guardar" click exists to flush anything,
does not click it after picking a thumbnail, and the reported bug is exactly what happens when they
don't.

## What Changes

- `onPopoverSelectImage` flushes the write **immediately** after `updateShapes`, instead of
  leaving it to the generic debounce. It reads the store directly with tldraw's own
  `getSnapshot(store)` — a synchronous, un-batched reader — rather than trusting
  `lastSnapshot` (which is fed by the same debounced listener and was measured to still hold the
  _pre-pick_ snapshot immediately after `updateShapes` returns).
- No change to the generic debounce itself. Dragging, resizing and every other continuous edit
  keep the 1-second coalescing behaviour; only the picker's discrete write bypasses it.
- No change in multiplayer/sync mode: the `TLSocketRoom` on the server already holds the update
  the instant it arrives over the socket and persists it independently of the client's page
  lifetime, so this race does not exist there.
- A spec correction: "persist it with the diagram" (the existing requirement's wording) is
  ambiguous enough to have let this ship; it is tightened to say the write survives an _immediate_
  reload with no separate save action.

## Non-Goals

- Not touching the general 1-second autosave debounce for ordinary editing — it does its job for
  the case it exists for.
- Not adding a "saving..." indicator to every possible write path; the fix removes the window this
  particular defect needed, rather than making the window visible.
- Not multiplayer/sync mode — measured to not have this race (see design.md).

## Impact

- `app/pages/campaigns/[id]/diagrams/[diagramId].vue` (`onPopoverSelectImage`) — the only file
  touched.
- Spec: `diagram-entity-palette` (MODIFIED — "The image is chosen from the shape own preview
  popover").
- New e2e coverage: `tests/e2e/diagram-image-override.spec.ts` gains a scenario that reloads
  **without** calling `saveDiagramNow()`, so the regression this change fixes cannot silently
  return.
- No server, schema, or CLI change. No new endpoint, no data model change — the aleph-cli has
  nothing to update.
