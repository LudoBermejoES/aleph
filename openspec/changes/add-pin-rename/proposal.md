## Why

The pins list under a map (`app/pages/campaigns/[id]/maps/[slug]/index.vue`) shows the pin's name and
a delete button, but there is no way to correct a name — today the only way to fix one is to delete
the pin and re-drop the entity, which loses its colour/group/visibility and its stable id. That
already happened five times in one session, by hand, over SQL.

**This collides with a change that landed minutes before this one, in the same working tree.** A
pin's displayed name used to be `mapPins.label`, a copy of the linked entity's name taken at creation
time. That copy goes stale silently whenever the entity is renamed — which is exactly what forced the
five hand-repairs — so `pinDisplayName` (`app/utils/mapPinMarker.ts`) and the server join
(`server/services/maps.ts`) were just changed to prefer the entity's **live** name
(`entityName || label || fallback`) over the stored label.

That is correct for a pin whose label is nothing but a stale copy. It is wrong the moment this change
adds a way to deliberately rename a pin: a rename the owner just made would be immediately
overridden by the live entity name and look like a no-op. The fix has to distinguish "this label is
an old copy nobody chose" from "someone just typed this on purpose", and it has to say what happens to
the labels that already exist under the OLD copy-on-create behaviour — most of which are
indistinguishable from a stale copy today, because they were hand-repaired to match the entity's
current name a few hours before this proposal was written.

## What Changes

- **A deliberately-set label now wins over the entity's live name.** Priority becomes: custom label →
  live entity name → placeholder. This only means anything once "deliberate" is well-defined, which is
  the next two points.
- **Pin creation stops copying the entity's name into `label`.** `onPinDrop`'s label-from-dragged-entity
  and the CLI's `--label` requirement on `pin-add` both go away (label becomes optional there). From
  this point on, a non-null `label` means a human chose it — which is the only thing that makes "custom
  label wins" a safe rule to add.
- **A one-off, idempotent backfill nulls every existing pin label that already equals its linked
  entity's current name** (trimmed, case-insensitive) — see design.md D3 for why this is the right cut
  and what it leaves alone.
- **A new way to rename a pin**: `PATCH .../pins/[pinId]` is widened to also accept an optional
  `label` (in addition to the `lat`/`lng` it already accepts) — see design.md D2 for why this endpoint
  and not a new one. Sending an empty label clears it back to "derive from the entity". The CLI gains
  a matching `map pin-rename` command.
- **An edit affordance in the pins list**, next to the existing delete button, editor+ only. Renaming
  does not rebuild the map or close an open popup — the same rule already established for moving and
  deleting a pin.

## Non-Goals

- Renaming a pin's colour, group, visibility or linked entity. Only its label.
- A rich text-editing modal. A simple prompt is enough for one text field, consistent with the
  browser-native `confirm()`/`alert()` this same pins list already uses for delete.
- Any change to `pinDisplayName` beyond the one priority flip above. The function's shape, its
  fallback-placeholder argument, and everywhere it is called (marker popup, pins list) are unchanged.
