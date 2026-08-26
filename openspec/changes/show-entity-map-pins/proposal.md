## Why

The link between an entity and the map only runs one way. Standing on the Berlin map you can open a
pin's popup and jump to the entity ("Ver entidad"); standing on **Berghain's own page** there is
nothing telling you it is on a map at all, let alone taking you to it.

That asymmetry costs most where the campaign is actually read. There are 24 pins today and the roster
is 43 locations, 28 organizations and 152 characters: a reader on a character's page has no way to
know that character is placed somewhere, and the only route is to remember the map exists, open it,
and hunt.

The parts to fix it are already half-built and pulling in opposite directions:

- `focusPin(pinId)` exists on the map page (`index.vue:281`) and `MapViewer.client.vue` exposes it,
  because the pins list under the map already uses it to fly to a pin.
- The map page already calls `useRoute()`/`useRouter()` (`:192-193`) but reads **nothing** from the
  query string.
- **No endpoint answers "which maps is this entity pinned on".** `mapPins` is only ever queried by
  `mapId`; there is no reverse lookup anywhere in `server/services/maps.ts`.

So this is one query, one URL contract, and a link on three detail pages.

## What Changes

- **A reverse lookup**: given an entity, the maps it is pinned on and where. Returns enough to render
  a link and to address the pin — the map's name and slug, the pin's id, its label and coordinates.
- **Locations, organizations and characters** show their map placements on their detail page, as a
  link per pin.
- **A pin can be addressed by URL**: opening a map with a pin identified in the query string centres
  and zooms on that pin and opens its popup, reusing the `focusPin` the pins list already uses.
- The same visibility rules that already govern a pin's entity fields govern this in reverse: a
  viewer is never told about a placement on a map they may not see.

## Non-Goals

- No new map UI. The focus behaviour is the one the pins list already triggers.
- No editing from the detail page — no creating, moving or deleting a pin there. Read-and-navigate
  only; the map remains the place where pins are managed.
- No cross-campaign lookup. An entity belongs to one campaign and so do its maps.
- Not a general "where does this entity appear" panel. Only map pins; sessions, relations and
  mentions already have their own surfaces.
