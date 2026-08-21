## Why

Two defects that combine to produce a 404 on a link the app itself renders.

**1. The relations panel hand-rolls entity URLs instead of using the helper that already exists.**
`app/utils/entity-routes.ts` exports `entityDetailPath()`, which maps a type to its route segment and
falls back to the generic `entities/:slug` page. `EntityPopover.vue` and `SearchCommand.vue` both use
it. `EntityRelationsPanel.vue:29` does not — it builds
`` `/campaigns/${campaignId}/${rel.relatedEntityType}s/${rel.relatedEntitySlug}` ``, i.e. the type plus
an `s`. It is the only site in the app that does this.

So the mapping was never missing; one component simply bypassed it. Of the nine entity
types registered for `Berlin en tinieblas` — `character, event, faction, item, location, lore, note,
quest, session` — **four produce a dead link**:

| type      | generated    | result                              |
| --------- | ------------ | ----------------------------------- |
| `lore`    | `/lores/`    | 404                                 |
| `note`    | `/notes/`    | 404                                 |
| `event`   | `/events/`   | 404                                 |
| `faction` | `/factions/` | 404 — the page is `/organizations/` |

The five that work (`character`, `item`, `location`, `quest`, `session`) work by coincidence of
naming, not by design. Measured on a real link: the session _El maniquí en el armario_ relates to the
`lore` entity `la-vieja-del-maniqui`, and the panel renders a link to `/lores/la-vieja-del-maniqui`,
which 404s.

**2. `entity create --type` accepts a type the campaign does not have.**
Its own help advertises `e.g. location, faction, npc`, and `npc` is **not** a registered type for this
campaign. The CLI wrote the entity anyway, producing a record the UI cannot categorise. That is how
`los-dos-hombres-de-abrigo` came to exist as `type: npc` in a campaign whose type set has no `npc`.

## What Changes

- `EntityRelationsPanel.vue` uses the existing `entityDetailPath()` instead of pluralising, making it
  consistent with the two components that already do.
- `entity-routes.ts` is left ALONE. A first pass added `faction -> organizations` and
  `item -> items`; both were wrong and the existing test caught them. `/items/` is the economy-items
  page and `/organizations/` lists real organization records — a wiki entity of type `item` or
  `faction` is neither, so those mappings would send it to a page with no matching record instead of
  to the generic view that always works. The pre-existing test uses `item` as its canonical example
  of "a type with no dedicated page" precisely for that reason.
- So the only production change on the UI side is the one-line bypass in the relations panel. The
  fallback already sends `lore`, `note`, `event`, `faction` and `item` to `entities/[slug]`, which
  renders any type — verified, that page does not branch on type.
- `entity create --type` validates against the campaign's registered types and refuses an unknown
  one, listing the valid set in the error.
- The CLI help stops advertising `npc` as an example, since it is not universally registered.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aleph-cli`: ADDS a requirement that entity creation rejects a type the campaign does not declare.
- `worldbuilding-wiki`: ADDS a requirement that an entity link resolves to a real page for every
  registered type, via one mapping rather than string pluralisation.

## Impact

- `app/components/relations/EntityRelationsPanel.vue` — the only site that pluralises a type today.
- `app/utils/` — the new shared mapping.
- `cli/src/commands/entity.js` — validation and help text.
- `tests/unit/` — the mapping (every registered type resolves to an existing route) and the CLI guard.

**Also fixed, same family, pre-existing**: `tests/unit/components/diagram-sidebar-legibility.test.ts`
built its file list with `path.join`, so on Windows it produced backslashes, never matched the
forward-slash audited list, and failed — a Windows-only false failure in a test about colour tokens.
Separators normalised.

**Not in scope**: adding pages for `event`, `note` and `lore`. They fall back to `entities/[slug]`,
which already renders them correctly; dedicated pages are a design decision, not a bug fix.
