## Why

**`maps.visibility` is not enforced anywhere.** The column exists
(`server/db/schema/maps.ts:31`, `notNull().default('members')`), it has its own index —
`idx_maps_visibility`, created deliberately in migration `0017` — and **not one server query reads
it.** `grep -rn "maps.visibility" server/` returns migrations and snapshots only.

So marking a map `dm_only` today protects nothing: every campaign member sees it, opens it, and reads
its pins, layers, regions and tiles. The control is in the schema, in the UI's vocabulary and in the
index, and absent from the code — which is the worst of the three states, because it _looks_ enforced.

It was found by accident. `show-entity-map-pins`'s design told its implementer to "reuse the predicate
the map listing already applies"; the implementer went to read it and there was none, and said so
instead of inventing one. That change guards its own new endpoint, but the seven pre-existing surfaces
are still open:

```
maps/index.get.ts               maps/[slug]/index.get.ts
maps/[slug]/image.get.ts        maps/[slug]/tiles/[z]/[x]/[y].get.ts
maps/[slug]/pins/index.get.ts   maps/[slug]/layers/index.get.ts
maps/[slug]/regions/index.get.ts
```

`tiles` is the one that matters most: it serves the map's actual imagery, so a hidden map's contents
are fetchable by anyone who can guess a slug.

**The blast radius of fixing it is nil today**, which is why it should be fixed now rather than after
someone relies on it: the Berlin campaign has one map and it is `members`, the default. Enforcing the
rule changes what nobody currently sees.

## What Changes

- Every map read surface filters on the map's visibility, using **the predicate that already exists**
  (`VISIBILITY_MIN_ROLE` / `ROLE_LEVEL` / `buildVisibilityFilter` in `server/utils/permissions.ts`,
  already applied by search, characters, entities, locations and organizations).
- A map the viewer may not see is **absent**, not blanked: the listing omits it and every per-map
  route answers as it would for a slug that does not exist.
- The sub-resources check the **parent map's** visibility, not only their own. A pin, layer, region,
  tile or image request must not be a back door into a map the viewer cannot open.

## Non-Goals

- No new visibility vocabulary and no new predicate. The levels and the comparison already exist; this
  change stops bypassing them.
- No change to who may _write_ a map. Write routes are role-gated already; if a gap is found there,
  report it rather than widening this change.
- No UI work. The picker already offers the levels; the point is that choosing one starts meaning
  something.
- Not a general audit of every entity type's visibility. Only maps and their sub-resources.
