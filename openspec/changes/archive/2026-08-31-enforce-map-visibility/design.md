## Context

`server/utils/permissions.ts` already holds the whole mechanism: `ROLE_HIERARCHY` → `ROLE_LEVEL`,
`VISIBILITY_MIN_ROLE`, and a `buildVisibilityFilter` used by `search`, `characters/index`,
`entities/index`, `locations/index` and `organizations/index`. `server/services/maps.ts` uses the same
tables for a **pin's** own visibility, and `show-entity-map-pins` just added `isVisibleToRole` for a
single row.

So there is nothing to design about the rule. What needs deciding is where it goes and how a denial
behaves.

## Decisions

### D1. One helper, applied at every surface — not a filter bolted onto each handler

The map's visibility check belongs beside the map lookup, so that no route can fetch a map without it.
Put the resolve-and-authorise step in `server/services/maps.ts` (a `getMapForRole(...)`-shaped
function) and have every route obtain its map through that, rather than each of the seven handlers
growing its own `if`.

Why: seven copies of a security check is seven chances to miss one, and the eighth route added next
month starts life unprotected. A single seam means a new route has to go out of its way to be wrong.

### D2. A denial is indistinguishable from absence

A map the viewer may not see returns **404**, exactly as an unknown slug does — not 403.

403 confirms the map exists, which is the fact being protected. This mirrors what the reverse lookup
already does (omit the placement rather than return it with a blanked slug) and keeps the two
directions consistent.

The listing simply omits the row. No count, no placeholder.

### D3. Sub-resources authorise the PARENT, and that is the actual hole

`pins`, `layers`, `regions`, `image` and `tiles` are addressed by the map's slug. Checking only their
own visibility — or nothing — means a viewer who cannot open a map can still read its contents by
requesting them directly. **`tiles/[z]/[x]/[y]` is the sharpest case**: it serves the imagery, so
without the parent check the map is readable in full by anyone who can guess a slug.

Every sub-resource must resolve its parent map through D1's seam before doing anything else.

### D4. Do not touch the pin-level visibility that already works

`filterPinsByVisibility` already hides individual pins. This change adds the map layer _above_ it; the
two compose (a visible map may still contain hidden pins). Do not merge or replace the existing pin
logic — that would be rewriting a working control while adding a missing one, and a regression there
would be invisible.

### D5. Measure the blast radius before deploying, across every campaign

Today's Berlin campaign has one map, `members` — enforcing changes nothing anyone sees. But there are
four campaigns (`arcadia-la-fuerza-oculta`, `kult`, `kingmaker`, `berlin-en-tinieblas`). **Count maps
by visibility in all of them and report it.** If any map is `dm_only`/`private`, this change will
start hiding it from players who can see it today — correct behaviour, but the owner should be told
before it ships, not after a player asks where a map went.

## Risks

- **The tile route is hot.** It is requested many times per map view, so the parent lookup must not add
  a query per tile. Resolve once and cache per request, or accept one indexed lookup and say so with a
  measurement — do not add an unmeasured N-per-tile cost.
- **A 404 where a 200 used to be is a visible break if the rule is wrong.** The predicate is shared, so
  the risk is in the _wiring_: a route that resolves the map with the wrong role (e.g. a default
  `visitor` when the real role is `dm`) would lock out the owner. Test the positive path for a `dm`
  and a `player` on the same map, not only the denial.
- Nested maps: a child map's visibility is its own. Do not infer it from the parent, and do not
  silently hide a visible child because its parent is hidden — decide, and record the decision.
