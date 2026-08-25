## Why

Three defects reported by the owner after using `add-osm-maps` in anger. All three were traced to
specific code before writing this, so none of them is a guess.

**1. Dropping an entity looks like the page reloading.** It is not a reload — it is the Leaflet map
being destroyed and rebuilt. `onPinDrop`
(`app/pages/campaigns/[id]/maps/[slug]/index.vue:214`) ends with `await load()`, and `load()`
refetches the map AND the campaign inside `withLoading`, which flips the page's loading state.
`MapViewer.client.vue` is unmounted, its `onUnmounted` runs `map.remove()`, and a fresh Leaflet
instance is built from scratch. The pin IS saved — the owner confirmed that — but the viewport is
not: zoom and centre snap back, which on a city-scale OSM map means losing your place after every
single drop. Dropping five pins on one street means finding that street five times.

**2. Every pin looks identical.** `renderPins` (`MapViewer.client.vue:269`) builds one hardcoded
`L.divIcon`: a 16px circle filled with `pin.color || '#3b82f6'`. There is no icon, no type
distinction and no entity image, so a map with a dozen pins is a dozen identical blue dots. The
owner asked for the marker to vary by entity type, and preferred the entity's own image — which is
the better answer, because aleph already renders entity portraits elsewhere
(`EntityImage.vue`, `CharacterPortrait.vue`) and a face is recognisable where a coloured dot is not.

**3. A pin cannot be deleted from the interface.** The endpoint has existed all along —
`server/api/campaigns/[id]/maps/[slug]/pins/[pinId]/index.delete.ts` — and the CLI has reached it
since `add-osm-maps` (`aleph map pin-delete`). Only the UI never grew the affordance, so a
mis-dropped pin is permanent unless you open a terminal. That asymmetry is the whole defect: this
is a missing button, not a missing capability.

## What Changes

- **Pin creation stops rebuilding the map.** `onPinDrop` appends the created pin to
  `mapData.value.pins` instead of calling `load()`. The POST already returns the created row, so no
  extra request is needed and the map is never unmounted. Zoom and centre survive.
- **A pin is marked by its entity's image**, in a circular marker sized for a map, falling back to
  a per-entity-type icon when the entity has no image, and to today's coloured dot when there is no
  entity at all (a pin need not have one — `entityId` is optional).
- **The pins GET endpoint returns what the marker needs**: the linked entity's image URL and type.
  The client cannot derive them today; the pin row carries only `entityId`.
- **A pin can be deleted from the UI**, from both places a pin is visible: its marker popup and the
  pins list already rendered beneath the map (`index.vue:122`). Editor+ only, matching the POST's
  own gate, with the server staying the authority.
- Deleting a pin removes its marker without rebuilding the map either — the same rule as creation.

## Non-Goals

- The icon library, right-click context menu, per-pin visibility levels and pin groups that the
  `maps` spec already describes aspirationally. This change does not implement them and does not
  remove them from the spec.
- Editing a pin's label, colour or position after creation.
- Any change to how `image` maps convert coordinates, or to the OSM tile/geocoding work just
  shipped.
