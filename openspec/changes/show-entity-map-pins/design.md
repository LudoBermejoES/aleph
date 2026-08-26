## Context

`mapPins` holds `mapId` + `entityId`. Every query in `server/services/maps.ts` goes in one direction —
`selectJoinedPins` filters by `mapId` and joins outward to `entities`, `characters`, `organizations`
and `entity_images` to build what a marker needs. Nothing filters by `entityId`.

The three detail pages reach `entities` differently, which matters for the join: a **location** _is_
an entity row; a **character** and an **organization** each carry their own `entityId` column
(`characters.entityId`, `organizations.entityId`). So the lookup is by entity id, and each page has to
resolve its own entity id first.

The focus half is nearly free: `MapViewer.client.vue` already exposes `focusPin`, and the map page
already imports `useRoute`.

## Decisions

### D1. One endpoint keyed by entity, returning placements

`GET .../entities/[slug]/map-pins` (or the equivalent that fits the existing route tree — check what
already lives under `entities/[slug]/` before adding a sibling). It returns a list, because **an
entity can be pinned more than once**: on several maps, and more than once on the same map. Nothing in
the schema forbids it and the campaign already has nested maps, so the singular case is an assumption,
not a fact. Return a list even when it has one element, and render "1 placement" from it rather than
special-casing.

Rejected: extending each of the three detail endpoints with a `mapPins` field. It would triple the
query surface for one feature and put the same join in three places — the shape this project has been
bitten by whenever a rule lived in more than one file.

### D2. Reuse the visibility rule, inverted

`withEntityVisibility` in `server/services/maps.ts` already strips an entity's fields from a pin when
the viewer may not see the entity. This is the mirror: the viewer may see the entity (they are on its
page) but **may not be allowed to see the map**. So the filter is on the MAP's visibility, not the
entity's, and it must be applied server-side.

Do not invent a rule: find how map visibility is already enforced when listing maps
(`server/api/campaigns/[id]/maps/index.get.ts`) and use the same predicate. A placement the viewer
cannot reach must be **omitted entirely** — not returned with a null slug, which would tell them a
hidden map exists.

### D3. The pin is addressed in the query string, and the map focuses it on mount

`/campaigns/{id}/maps/{slug}?pin={pinId}`. The map page reads it after the map and its markers exist
and calls the `focusPin` it already has.

**The race is the whole difficulty and it will fail silently.** `focusPin` looks the pin up in
`markerPins`, which is populated by `renderPins` — which runs after Leaflet loads asynchronously and
after `pins` arrive. Read the query param too early and `focusPin` finds nothing, returns, and the
page looks merely ordinary: no error, no console warning, just a map that did not fly anywhere. So
trigger it from a point that is guaranteed to be after markers exist, and **write a test that fails
when it is triggered too early** — otherwise this regresses the first time the load order changes.

A pin id in the URL that does not exist (deleted, or on another map) must degrade to "just show the
map", never to an error page.

### D4. The link says which map, not just "on the map"

The campaign has more than one map and supports nested ones, so a bare "see on map" is ambiguous the
moment a second map has pins. Show the map's name. Where an entity has several placements, show them
all — with the pin's own label where it differs from the entity's name, since that is exactly the case
a custom pin label exists for.

### D5. Do not duplicate the pin's display-name logic

`pinDisplayName(pin, fallback)` in `app/utils/mapPinMarker.ts` is already the single decision for what
a pin is called (`label || entityName || fallback`). Import it. A second copy would drift the first
time the rule changes — and the rule has already changed once today.

## Risks

- **Three detail pages means three chances to diverge.** Put the fetch and the rendering in one
  component used by all three, not three copies of a `v-for`.
- **A character's `entityId` can be null** (`organizations.entityId` is `references(...)` with
  `onDelete: 'set null'`). Handle the no-entity case before querying, or the endpoint gets a null id.
- Adding a request to three of the most-visited pages: keep it to one query, and make sure an entity
  with no placements costs nothing visible — no empty panel, no spinner that resolves to nothing.
