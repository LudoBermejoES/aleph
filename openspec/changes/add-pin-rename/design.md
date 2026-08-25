## Context

Three pieces already exist and must not be broken:

- `mapPins.label` — a nullable text column, previously written at creation time as a copy of the
  dragged entity's name (`onPinDrop` in `index.vue`), or via the CLI's then-`--label`-required
  `pin-add`.
- `pinDisplayName(pin, fallback)` in `app/utils/mapPinMarker.ts` — already changed, in the same
  working tree (uncommitted, no OpenSpec paperwork of its own), from `label || fallback` to
  `entityName || label || fallback`, to fix a real production incident (a renamed entity left five
  pins showing a stale copy of its old name). Used by both the marker popup and the pins list. **This
  change flips it again**, to `label || entityName || fallback` — see D1 for why that is not
  relitigating the fix, but a further-informed version of it.
- `getPinsWithEntity`/`getPinWithEntity` in `server/services/maps.ts` — already changed to join and
  serve `entities.name` as `entityName`, visibility-filtered the same way `entityImageUrl`/`entityType`
  are (nulled when the viewer cannot see the linked entity; `label` is never nulled by that rule, since
  it is metadata the pin's own author wrote, not the entity's).
- `suppressNextPinsRender` — a `MapViewer.client.vue`-local flag guarding its `deep: true` watcher on
  `props.pins`. Set by the component's OWN `dragend` handler right before the page mutates
  `mapData.value.pins[i]`, so the resulting watcher tick is swallowed instead of destroying and
  rebuilding every marker (which would flicker and close an open popup). Never previously armed from
  outside the component.

## Decisions

### D1. Priority flips again: custom label → live entity name → placeholder

The just-landed `entityName || label || fallback` is **this change's own starting bug**, not a
foundation to build on unmodified: the moment a rename affordance exists, that priority makes every
rename invisible — the owner types a new name, saves it, and the live entity name keeps winning, so
it looks like a no-op. `pinDisplayName` (and the popup title, which calls it) is changed to
`label || entityName || fallback`.

This is NOT simply reverting to the pre-incident `label || fallback` and losing the fix: the
incident's actual cause was that `onPinDrop`/`pin-add` copied the entity's name into `label` at
creation, so a stale `label` and a "no label at all" pin were indistinguishable from the same
column. This change removes that cause directly (`onPinDrop` and `pin-add --label` stop copying,
below), which is what makes "the label wins" safe again: from here on a non-null `label` means a
human deliberately set it, not that the entity's name was ever copied into it. D3 is what closes the
gap for every pin that predates that rule and therefore cannot yet make that promise.

### D2. Same PATCH endpoint, widened — not a new endpoint, not a PUT

`PATCH .../pins/[pinId]` already exists, gated `editor+`, and already returns the shared
`getPinWithEntity` shape. `move-pins-and-resolve-entity-images/design.md` D2 deliberately kept it to
`{ lat, lng }` and rejected a PUT, reasoning that "replace the pin" would invite label/colour/entity
changes it did not want. That reasoning does not disqualify label from THIS endpoint — it disqualifies
an unbounded PUT. Widening the same PATCH to accept one more named, validated, optional field is a
smaller and more honest change than either of the alternatives:

- **A new `PATCH .../pins/[pinId]/label` sub-resource** was considered and rejected. It would need its
  own route file, its own gate, its own shape (still `getPinWithEntity`, to stay consistent with every
  other pin mutation), and it splits one "update a pin" concept across two URLs for no behavioural
  gain — a client wanting to move AND rename in one user action (drag, then immediately correct the
  name) would need two requests either way, but two endpoints make that look like two DIFFERENT
  operations, not two fields of the same one.
  A PUT that replaces the whole row was re-considered and re-rejected for the same reason the original
  design gave: it invites entity/colour/group changes nobody asked for, and — unlike lat/lng, which
  are always given together — a real caller legitimately wants to send `label` ALONE (rename without
  moving) or `{ lat, lng }` ALONE (move without renaming, e.g. every existing `pin-move` call), so a
  PUT's "give me the whole object back" contract is actively the wrong shape here, not just a wider one.

So: `pinCoordinatesSchema` (the piece `POST` also uses) stays exactly as it is, `lat`+`lng` both
required together where present. A new `pinUpdateSchema` in `mapGeo.ts` describes the PATCH body:
`lat`/`lng` optional but only as a pair, `label` optional and independent, and at least one of the two
groups must be present — an empty PATCH body is rejected rather than silently doing nothing.
`existing.mapId !== map.id` / 404 / role-gate checks are unchanged.

**The recorded, honest cost**: `move-pins-and-resolve-entity-images`'s own integration test
(`tests/integration/maps-pin-move.test.ts`, `'a body with label/color/entityId does not apply those
fields'`) asserted that a label sent alongside `lat`/`lng` is dropped. That assertion is now FALSE by
design — label is no longer an unrelated field this endpoint refuses, it is one of the two things it
legitimately updates. The test is rewritten, not deleted: it keeps asserting `color`/`entityId` are
still ignored (those really are out of scope, unchanged), and gains its own coverage for label being
applied, label-only bodies, and clearing.

### D3. The 16 existing pins: null the ones that are indistinguishable from a stale copy, leave the rest

Every pin created before this change got its `label` from the SAME source `entityName` now serves
live — `onPinDrop` copied the dragged entity's `name` verbatim, and the CLI's `pin-add --label` was
usually filled with the same value by whoever was scripting it. Under D1's new priority, EVERY one of
those pins would keep showing today's label forever, even after the entity is renamed again —
reintroducing the exact staleness this change's precondition (D1) exists to end, just moved one
layer down.

The five pins hand-repaired hours before this proposal make the case concrete: their `label` was
edited (via SQL) to match the entity's CURRENT name, specifically to paper over the staleness bug
before this fix existed. Under D1 alone, those five would be treated as "deliberately renamed" and
would silently stop following the entity forever — the opposite of what the hand-repair was for.

**Decision**: a one-off, idempotent data backfill (`server/db/backfills/pin-label-entity-match.ts`,
run on every boot like the other backfills in that directory — `location-images.ts`,
`quest-entities.ts`, etc. — because a pure `.sql` migration can't express a cross-table comparison
against a mutable column) nulls `mapPins.label` wherever it equals its linked entity's CURRENT `name`,
trimmed and case-insensitively. Concretely:

- A pin whose label already equals its entity's name (the common case, and all 16 known live pins)
  becomes indistinguishable from "never had a custom label" and correctly starts following the live
  entity name again. This is not a guess: a label that matches the entity's name today conveys zero
  information a live join wouldn't already give for free, whether it was set by the old copy-at-create
  code or by a hand repair aimed at the same outcome.
- A pin whose label DIFFERS from its entity's current name is left untouched. It is genuinely
  ambiguous — it could be a deliberate custom name ("Old Bridge (destroyed)" on an entity named
  "Bridge"), or it could be a stale copy from before some earlier, uncaught rename. The backfill
  cannot tell those apart and must not guess by erasing data. What resolves the ambiguous case going
  forward is this proposal's own UI: the owner now has a first-class rename affordance (instead of
  delete-and-recreate) to either fix a stale one or keep a deliberate one — which is strictly better
  than what existed before this change for that same pin.
- A pin with no linked entity (`entityId IS NULL`) is untouched — D1's priority never reaches
  `entityName` for it, so nothing about it is stale in the sense this backfill addresses.

Idempotent because re-running it is a no-op once every matching label has already been nulled; safe on
an empty test database because the join simply returns nothing.

### D4. Clearing a label means "derive from the entity again", never `label = ''`

An empty string and `null` are NOT the same value here, and only one of them means what a user
clearing a text field expects. The PATCH endpoint normalizes an incoming `label` before writing it:
trim, and an empty result after trimming is stored as `null`, not `''`. `pinDisplayName`'s
`label || entityName || fallback` already treats `''` as falsy in JS, so this is not strictly required
for THAT function alone — but leaving `''` in the column would still count as "not null" for anything
that ever checks `label !== null` to decide whether a name was customised (D3's own reasoning, and any
future feature built on the same distinction), so normalizing at the write boundary is the one place
that keeps the invariant true everywhere, not just in the one function audited today.

### D5. Renaming must not rebuild the map, from OUTSIDE `MapViewer` for the first time

Every previous in-place pin mutation (`onPinDrop`'s append, `deletePin`'s filter, `onPinMove`'s
index-assignment after a PATCH) either happens before `MapViewer` mounts markers for the new state, or
is armed from INSIDE `MapViewer`'s own `dragend` handler, which sets `suppressNextPinsRender` on
itself before emitting to the page. A rename originates in the pins list in `index.vue`, entirely
outside `MapViewer` — there is no existing hook for a caller outside the component to arm that flag.

`MapViewer` now exposes `armPinsRenderSuppression()` alongside its existing `defineExpose({ focusPin
})`, doing exactly what the internal `dragend` handler already does to itself: set the same
component-local flag. The page calls it immediately before mutating `mapData.value.pins[i]` with the
PATCH response, exactly mirroring `onPinMove`'s existing ordering constraint (arm-before-mutate, not
after — the watcher is synchronous relative to the mutation, not the network request).

## Risks

- **A rename that races a rename of the linked entity itself** (two tabs, or a rename mid-typing) is
  not addressed here — last write wins, the same as every other pin/entity field in this codebase.
- **The backfill's equality check is a plain string compare (trimmed, lower-cased), not a normalized
  Unicode compare.** Given the corpus (16 pins, Spanish/German place and character names with no known
  combining-character edge cases), this is judged sufficient; a future corpus with real Unicode
  normalization needs would need a stronger comparison, not assumed away silently.
