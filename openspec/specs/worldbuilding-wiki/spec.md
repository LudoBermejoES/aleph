# worldbuilding-wiki Specification

## Purpose

The campaign wiki surface: leading icons on the campaign dashboard cards, entity images on the entity detail page (editable for editor role and above) and as thumbnails in the entity list, and a delete action on the entity detail page gated to `dm` and `co_dm` that confirms before deleting and redirecting.

## Requirements

### Requirement: Campaign dashboard cards display icons

Each card in the campaign dashboard grid (`app/pages/campaigns/[id]/index.vue`) SHALL render a leading icon (`w-6 h-6`) in the `CardHeader` before the `CardTitle`. The icon SHALL be the same icon used for that section in the sidebar.

#### Scenario: Wiki card has BookOpen icon

- **WHEN** the campaign dashboard is rendered
- **THEN** the Wiki card shows a `BookOpen` icon in the card header

#### Scenario: All 13 dashboard cards have icons

- **WHEN** the campaign dashboard is rendered
- **THEN** every card (Wiki, Characters, Maps, Sessions, Calendars, Quests, Items, Shops, Inventories, Currencies, Transactions, Graph, Members) shows its assigned icon

### Requirement: Entity detail view displays entity image

The entity detail page SHALL display the entity's image (if present) using the `EntityImage` component at `lg` size. When the user has `editor` role or above, the component SHALL be in editable mode.

#### Scenario: Entity with image shows it on detail page

- **WHEN** viewing an entity that has an uploaded image
- **THEN** the `EntityImage` component is rendered at `lg` size

#### Scenario: Entity without image shows placeholder for editors

- **WHEN** an editor views an entity with no image
- **THEN** the `EntityImage` component shows a clickable placeholder to upload

### Requirement: Entity list shows image thumbnails

The entity list page SHALL show a small image thumbnail for entities that have an `imageUrl`, displayed next to the entity name.

#### Scenario: Entity with image shows thumbnail in list

- **WHEN** viewing the entity list and an entity has an `imageUrl`
- **THEN** a `sm` size image thumbnail is rendered next to the entity name

### Requirement: Entity (wiki page) detail has a delete action

The entity detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/entities/:slug` on confirmation, then redirects to the entity list.

#### Scenario: DM can delete a wiki entity from the detail page

- **WHEN** a DM views an entity detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the entity is deleted
- **AND** the user is redirected to `/campaigns/:id/entities`

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
