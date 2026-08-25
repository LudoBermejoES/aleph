## Context

`MapViewer.client.vue` owns the Leaflet instance and is deliberately client-only. It receives
`pins` as a prop and re-renders them in `renderPins`, which begins by removing every existing
marker (`markers.forEach(m => m.remove())`) and rebuilding the list. That is cheap and already
reactive — which is precisely why a full page `load()` is the wrong tool for adding one pin.

## Decisions

### D1. Append to the prop array; do not refetch

`api.createMapPin` returns the created row. Pushing it onto `mapData.value.pins` triggers the
existing watcher, `renderPins` runs, and the new marker appears — with the map never unmounted.

Rejected: keeping `load()` but preserving the viewport by saving/restoring centre and zoom. It
works, but it treats the symptom: the map still tears down and rebuilds, tiles refetch, and any
future state held in the component (open popup, toggled group) is still lost. The cause is
refetching everything to learn one thing.

Rejected: `refreshNuxtData`. The page does not use `useFetch`/`useAsyncData` — `mapData` is a plain
`ref` filled by an imperative `load()` — so there is no cache key to invalidate.

**The failure mode to avoid:** if the POST's response shape does not match what `renderPins`
expects (notably the `lat`/`lng` the drop just computed, plus `entityId`, `label`, `groupId`,
`color`), the marker will render at the wrong place or not at all, and it will look correct until a
real reload disagrees with it. Verify the created row against the GET's row shape rather than
assuming they match, and if they differ, make the endpoint return the GET shape — do not paper over
it client-side.

### D2. The entity's image is the marker; type is the fallback

Three tiers, in order:

1. `entityId` set and that entity has an image → a circular marker showing it.
2. `entityId` set, no image → an icon chosen by the entity's `type`.
3. no `entityId` → today's coloured dot, unchanged.

Built as an `L.divIcon` with inline HTML, which is what the code already does — not `L.icon`, whose
`iconUrl` cannot produce a circular crop with a border. The image goes in a `background-image` on a
round div with `background-size: cover`, so a non-square portrait is cropped to the circle rather
than squashed. **This is the aspect-ratio rule the owner already asked for across aleph**, applied
here: `cover` is correct for a fixed circular frame (it is what `CharacterPortrait` uses for small
avatars), whereas the `object-contain` change made earlier was for large gallery images where the
whole picture must be visible. Do not blanket-apply `contain` here — a letterboxed map pin is worse.

A marker is ~32px. At that size a portrait is a smudge unless it is a face, so the fallback tier
matters: give every entity type a distinct, legible glyph rather than one generic icon.

Deliberately NOT loading the image through Vue: `renderPins` writes raw HTML strings into Leaflet
icons, and mounting a Vue component per marker would be a much larger change for no gain here.
Escape any interpolated entity data — `label` already goes into `bindPopup` unescaped
(`MapViewer.client.vue:289`), which is a pre-existing XSS hole this change should not widen and
should ideally close for the fields it touches.

### D3. The endpoint returns the entity's image and type

The `mapPins` row has `entityId` and nothing else about the entity. Two options were considered:

- The client fetches each linked entity. Rejected: N requests per map render, and the picker's
  100-entity page is not guaranteed to contain a pin's entity.
- The pins GET joins the entity and returns `entityImageUrl` + `entityType`. Chosen: one query, and
  the marker has what it needs at first paint with no second render.

The join must not leak an entity the viewer cannot see. Mirror whatever visibility rule the entities
endpoint already applies; if a pin's entity is not visible to this viewer, return the pin without
the entity fields rather than omitting the pin — the pin's own visibility is a separate question
this change does not touch.

### D4. Delete lives in both places a pin appears

The marker popup and the pins list under the map. One shared handler; the list is where you go when
a pin is mis-dropped somewhere you cannot easily click.

Gated on `isEditorPlus`, the same client-side gate the drop already uses, with the server remaining
the source of truth. Confirm before deleting — a pin is one click to make and, until now, was
impossible to remove.

On success, remove the pin from `mapData.value.pins` — same rule as D1, no `load()`.

## Risks

- **The popup's HTML is rebuilt on every `renderPins` call**, so a delete button inside it needs its
  handler attached after Leaflet inserts the DOM, not via a `@click` that never binds. The existing
  code already attaches `marker.on('click', …)` for shift-click, so use Leaflet's own event surface
  or bind on `popupopen`.
- **`renderPins` removes and re-adds every marker on any pin change.** With images this means
  re-reading each image URL; browsers cache it, but if a map ever holds hundreds of pins this
  becomes visible. Out of scope to fix, worth not making worse.
