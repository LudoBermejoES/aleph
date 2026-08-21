## ADDED Requirements

### Requirement: An entity link SHALL resolve to a real page for every registered type

Every link the app renders to an entity SHALL be built from a single type-to-route mapping, and SHALL
fall back to the generic `entities/[slug]` page for any type without a dedicated route. Building the
segment by appending `s` to the type SHALL NOT be used.

**The mapping already existed; one component bypassed it.** `app/utils/entity-routes.ts` exports
`entityDetailPath()`, with the fallback, and `EntityPopover.vue` and `SearchCommand.vue` use it.
`EntityRelationsPanel.vue` was the only site that hand-rolled the segment as
`` `${relatedEntityType}s` ``, and of the nine types registered for `Berlin en tinieblas` four gave a
dead link: `lore` -> `/lores/`, `note` -> `/notes/`, `event` -> `/events/`, and `faction` ->
`/factions/` when the page is `/organizations/`. The five that worked (`character`, `item`,
`location`, `quest`, `session`) did so by coincidence of naming. A real session page rendered a link
to `/lores/la-vieja-del-maniqui` and it 404ed.

The fallback is safe because the generic detail page does not branch on type: an unmapped type
renders there correctly rather than dead-ending.

#### Scenario: A type with a dedicated page

- **WHEN** an entity link is rendered for a type whose page exists (e.g. `character`, `location`)
- **THEN** it SHALL point at that page

#### Scenario: A type with no dedicated page

- **WHEN** the type is `lore`, `note`, `event`, `faction` or `item`
- **THEN** the link SHALL point at the generic `entities/<slug>` page
- **AND** it SHALL NOT produce a 404

#### Scenario: A type SHALL NOT be mapped to a page that lists a different kind of record

- **WHEN** a wiki entity's type shares a name with a page that lists real records of another kind —
  `item` with the economy-items page, `faction` with the organizations page
- **THEN** it SHALL keep falling back to the generic view
- **AND** it SHALL NOT be mapped to that page, which would resolve only for slugs that happen to
  name a real record of that other kind

#### Scenario: A type nobody anticipated

- **WHEN** an entity carries a type absent from the mapping
- **THEN** the link SHALL still resolve, via the generic page
