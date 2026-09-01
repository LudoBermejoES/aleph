## Why

The diagram's entity palette cannot add an object, a piece of lore, an event, a note, a session
or an arc to a canvas. It offers characters, locations, organizations and quests, and nothing
else — which is exactly what a DM sees and reports: _"veo personajes y lugares, pero no objetos"_.

The cause is one clause in `server/api/campaigns/[id]/diagrams/entities/index.get.ts`. Four of the
five groups it returns are queried by name; the fifth, `wiki`, is queried as:

```ts
or(eq(entities.type, 'entity'), eq(entities.type, 'wiki'))
```

**No entity in this app has ever had either of those types.** A campaign's types come from the
`entity_types` table, and the nine seeded for `berlin-en-tinieblas` are `character`, `location`,
`faction`, `item`, `event`, `lore`, `quest`, `note`, `session`. Neither `entity` nor `wiki` is
among them, so that query returns the empty set for every campaign in the database. `EntityPanel`
then drops empty groups (`.filter((g) => g.items.length > 0)`), so the group never renders and the
defect is invisible: the palette looks complete rather than broken.

Measured on `berlin-en-tinieblas` (372 entities, all 8 pages walked):

| type         | entities | in the palette |
| ------------ | -------: | -------------- |
| character    |      166 | yes            |
| session      |       99 | **no**         |
| location     |       45 | yes            |
| organization |       31 | yes            |
| arc          |       13 | **no**         |
| quest        |       10 | yes            |
| lore         |        5 | **no**         |
| item         |        3 | **no**         |

**120 of 372 entities — a third of the campaign — cannot be placed on a diagram**, including all
three objects and all five pieces of lore.

The existing integration test does not catch it because it asserts only that the five keys are
_present_ (`expect(data).toHaveProperty('wiki')`), never that any of them holds a row. An
always-empty array satisfies it.

Half of the feature already works and needs no change: the hydration endpoint
(`diagrams/entities/batch`) filters by campaign and id with **no type condition**, and
`getShapeType()` already falls back to `entityCard` for any unrecognised type. An item placed on a
canvas would render and survive a reload today — there is simply no way to place one.

## What Changes

- **Endpoint** (`diagrams/entities/index.get.ts`): the dead `wiki` clause is replaced by a fan-out
  over the campaign's **own** `entity_types` rows. Every declared type that is not already served
  by a dedicated group gets its own group, keyed by type slug, labelled with the campaign's own
  `name`, ordered by the campaign's own `sortOrder`.
- **Response** gains a `groups` array — `[{ key, label, translatable }]` — telling the client which
  groups to render, in what order, and whether the label is a built-in (translate it) or the
  campaign's own type name (show it verbatim). The five existing keys are unchanged, so any other
  reader keeps working.
- **`EntityPanel.vue`** renders `groups` from the server instead of its hardcoded list of five.
- **i18n**: no new keys for the campaign types (their names are user-editable data, not UI text);
  the four built-in labels keep theirs.
- **No new tldraw shape.** An object, a note or a session lands as the generic `entityCard` the
  fallback already produces — which also means the canvas's existing type filter already covers
  them: `TldrawCanvas.filterShapes` maps `wiki -> entityCard`. Its label is retitled from "Wiki"
  to "Other entities"/"Otras entidades" so the one filter button and the several new palette
  groups do not contradict each other.

## Impact

- Affected specs: `diagram-entity-palette` (new capability)
- Affected code: `server/api/campaigns/[id]/diagrams/entities/index.get.ts`,
  `app/components/diagrams/EntityPanel.vue`, `app/utils/diagram-shapes.ts` (comment only),
  `i18n/locales/{en,es}.json`
- **aleph-cli: no impact**, but not because the CLI is unaware of diagrams — it has four
  `diagram` commands. None of them reads _this_ endpoint: `grep -rn 'diagrams/entities' cli/src/`
  is empty, while a looser `grep -rn diagrams cli/src/` matches
  `list`/`create`/`delete`/`generate` and would read as impact where there is none.
- Migrations: none. No schema change.
