## Context

`improve-map-pin-markers-and-deletion` established the invariants this change must not break:
`renderPins` rebuilds all markers on any `pins` change; the watcher added there calls **only**
`renderPins`, never `initImageMap`/`initOsmMap` (the only functions that set centre and zoom), which
is what makes the viewport survive; and `getPinsWithEntity`/`getPinWithEntity` is one shared query so
the GET and POST row shapes cannot drift.

`mapPinMarker.ts` is a pure module building the icon/popup HTML, unit-testable without Leaflet.
`leafletLatLngToPin` / `pinToLeafletLatLng` in `mapPinGeometry.ts` already convert both directions
for both map types.

## Decisions

### D1. Drag uses Leaflet's own draggable marker, and persists on `dragend`

`L.marker(..., { draggable: true })` plus a `dragend` handler that reads `marker.getLatLng()`, runs it
through `leafletLatLngToPin` — the SAME converter the drop path uses, so an `image` map and an `osm`
map need no separate code — and PATCHes the pin.

`draggable` is set from the same `canCreatePins` prop the drop handler is gated on, so a viewer below
editor gets an immovable marker. The server stays the authority.

**On failure, put the marker back.** A rejected PATCH must not leave the marker at a position the
database does not hold, because `renderPins` will not run (nothing changed in `pins`) and the lie
persists until a reload. Capture the pre-drag position and restore it on error.

**Do not re-render on success.** Updating `mapData.value.pins[i]` in place is enough for the model to
agree with the screen, and re-running `renderPins` would destroy and rebuild every marker — visible
as a flicker, and it would close an open popup. This is the same reasoning as D1 of the previous
change, one step further: there, the fix was not to refetch; here, it is not even to re-render.

### D2. A PATCH endpoint that accepts only coordinates

`PATCH .../pins/[pinId]` taking `{ lat, lng }`. Not PUT: this is a partial update of one field pair,
and a PUT implying "replace the pin" would invite label/colour/entity changes this change explicitly
does not want.

Validated by the same schema piece the POST uses for coordinates, so a value the POST would refuse
cannot arrive through the PATCH. Gated `editor+`, mirroring `index.post.ts` and
`[pinId]/index.delete.ts`. It returns the updated row **in the shared shape** — reuse
`getPinWithEntity`, do not hand-assemble a response, for the reason the previous change recorded: the
POST and GET had silently disagreed.

### D3. Image resolution: four sources, one declared order, resolved on the server

Priority, most specific first:

1. `entity_images.url` where `is_primary = 1` — the canonical "main image", guaranteed unique per
   entity by the `entity_images_one_primary` partial index.
2. `characters.portrait_url` (join `characters.entity_id = entities.id`) — 48 of 50 populated.
3. `organizations.image_url` (join `organizations.entity_id = entities.id`).
4. `entities.image_url` — the locations' home, 40 of 44 populated, and already working.

Rejected: switching on `entities.type` and reading only that type's column. It looks tidier and is
more fragile — an entity type can have images in more than one place (a location has both a gallery
and `entities.image_url`), custom campaign entity types exist and match no branch, and the priority
list degrades correctly for all of them while a switch needs a new arm per type.

Resolved **on the server**, extending the existing `getPinsWithEntity` query rather than adding
requests per pin. `entityImageUrl` keeps its name and meaning, so `mapPinMarker.ts` and its tests need
no change for this: **the marker code was already right; it was being fed from one table.**

The visibility rule already built there is unchanged and applies to every source: if the viewer cannot
see the entity, strip `entityImageUrl`/`entityType` and still return the pin.

**Watch the row count.** Three LEFT JOINs plus a correlated lookup for the primary image, over every
pin on a map. `characters.entity_id` and `organizations.entity_id` are unique per entity so they
cannot fan out, but `entity_images` has many rows per entity — it must be constrained to
`is_primary = 1`, or every pin multiplies by its gallery size. That is a correctness bug, not just a
slow query.

### D4. Every URL here is an API route, not a file

Measured: portraits are `/api/campaigns/{id}/characters/{slug}/portrait`, organizations
`/api/campaigns/{id}/organizations/{slug}/image`. They are authenticated endpoints, so the browser
will send session cookies for the `background-image` request the same way it does for `<img>` on the
character page — but confirm it, because a 401 on a `background-image` fails **silently**: no console
error, no broken-image icon, just an empty circle that is indistinguishable from "no image". If it
does fail, that is the finding, and the fallback must be the type icon rather than a blank marker.

## Risks

- **A silent blank marker is worse than the type icon it replaces.** The image tier must only be
  chosen when there is a URL, and the CSS must keep the type-icon glyph or the coloured background
  beneath it so a failed load degrades to something visible rather than a hole.
- **`dragend` fires on a click-with-no-movement** in some Leaflet versions. A PATCH with unchanged
  coordinates is harmless but noisy; skip the request when the position is unchanged.
- Marker drag and the map's own pan share the pointer. Leaflet handles this, but the existing
  shift-click-to-explore handler on the marker must keep working — verify it still fires.
