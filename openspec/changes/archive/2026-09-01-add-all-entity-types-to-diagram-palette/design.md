# Design

## D1 — Group by the campaign's own entity types, not by a hardcoded list

The endpoint's five groups are a taxonomy typed into the source. The data model does not work that
way: types live in `entity_types`, one row per campaign, with `slug`, `name`, `icon`, `sortOrder`
and an `isBuiltin` flag — and `entity type-update` lets a DM rename them. Any list of type names
written into a query or a component is guaranteed to drift from a campaign that adds one.

So the extra groups are derived: read this campaign's `entity_types`, drop the ones a dedicated
group already serves, and emit one group per remaining type, ordered by the campaign's own
`sortOrder`.

**Rejected — "just add `item` to the `or()`".** It answers today's report and leaves `lore`,
`event`, `note`, `session`, `arc` and every future custom type broken, in a clause that has
already been wrong for the entire life of the feature precisely because it was written as a
literal list.

## D2 — `organization` and `quest` keep their own queries; the type fan-out excludes them

`organizations` and `quests` are separate tables with their own ids, and the palette reads them
from there — an `organization` shape needs `factionCard` with a crest, a `quest` needs `questNode`
with a status. The fan-out therefore excludes `character`, `location`, `quest` and `faction`
(the `entity_types` slug whose entities are served from the `organizations` table).

Note the asymmetry this exposes and does **not** try to fix: the campaign's type slug is `faction`
while `entities.type` for those rows is `organization`. Both spellings must be excluded or the
palette shows organizations twice.

## D3 — The response tells the client what to render

The response keeps its five existing keys and its `Record<string, Entity[]>` shape — the panel
already indexes it that way, the integration test asserts those keys, and a change of shape would
break both for no gain. It gains one key per extra type and a sibling:

```ts
groups: {
  key: string
  label: string
  builtin: boolean
}
;[]
```

`builtin: true` marks the four groups whose label is UI text (`diagrams.panel.characters` …) and
must be translated client-side. `builtin: false` marks a campaign type, whose `label` is the
campaign's own `entity_types.name` and is shown **verbatim** — it is user data, and running it
through `t()` would print a raw key like `diagrams.panel.item` to the reader.

**Rejected — deriving the extra labels from i18n keys.** It cannot work for a custom type, and it
would silently regress the moment a DM renames one.

## D4 — No new shape; the fallback is the design

`getShapeType()` already returns `entityCard` for anything it does not recognise, and
`buildShapeCreateArgs`'s `default` branch fills `entityName`, `entityType` and `portraitUrl`. An
item with an uploaded image therefore renders with its image and its type printed on the card,
with no code added.

Two consequences worth stating rather than discovering later:

1. `getEntityTypeFromShape('entityCard')` returns `'entity'`, so a placed object reports the
   generic type on the way back. That is **correct** for every consumer: `EntityPopover` fetches
   `/api/campaigns/:id/entities/:slug`, which serves any entity type.
2. `TldrawCanvas.filterShapes` maps `wiki -> entityCard`, so the canvas filter already dims and
   reveals these cards as one bucket. Only its **label** is wrong once the palette names the types
   individually, so the label changes and the mapping does not.

## D5 — Hydration already works, and that is load-bearing to verify, not to assume

`diagrams/entities/batch` selects from `entities` filtered by campaign and id with no type
condition, so a placed object survives a reload today. The change adds nothing there. This is
asserted by a test rather than trusted, because the failure mode is invisible: a diagram that
loads with a blank card looks like a rendering bug, not a hydration filter.

## D6 — The guard has to fail for the right reason

The existing integration test passes against the broken endpoint, because
`expect(data).toHaveProperty('wiki')` is satisfied by `[]`. The new tests are written from the
rule — _the palette offers every entity type the campaign declares_ — and each is mutation-checked
by restoring the `or(eq(type,'entity'), eq(type,'wiki'))` clause and requiring red.
