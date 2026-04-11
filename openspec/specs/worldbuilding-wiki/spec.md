## MODIFIED Requirements

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
