## ADDED Requirements

### Requirement: The diagram palette offers every entity type the campaign declares

`GET /api/campaigns/:id/diagrams/entities` SHALL return, for each entity type declared in that
campaign's `entity_types` table, the entities of that type that match the search query — so that
any entity a campaign can hold can be placed on a diagram.

The response SHALL keep the keys `characters`, `locations`, `organizations`, `quests` and `wiki`,
each an array. It SHALL additionally carry one key per declared entity type not already served by
one of those groups, keyed by the type's `slug`.

The type fan-out MUST exclude `character`, `location`, `quest` and `faction`, whose entities are
served by the dedicated groups. Because those rows carry `entities.type = 'organization'` while
their `entity_types.slug` is `faction`, the exclusion MUST cover **both** spellings; an entity
MUST NOT appear in two groups of one response.

The response SHALL carry `groups: { key, label, builtin }[]` naming which groups to render and in
what order. Order SHALL be the four built-in groups followed by the campaign's types in
`entity_types.sortOrder`. `builtin` SHALL be `true` only for the four groups whose label is UI
text; for a campaign type it SHALL be `false` and `label` SHALL be the campaign's own
`entity_types.name`.

Every group SHALL be capped at the endpoint's existing per-type limit. Visibility rules are
unchanged: a caller below `co_dm` MUST NOT receive an entity whose `visibility` is `dm_only`, and a
caller below `player` MUST receive `403`.

#### Scenario: an object appears in the palette

- **GIVEN** a campaign declaring the type `item` and holding an entity of that type named "El traje de oro"
- **WHEN** a DM calls `GET /api/campaigns/:id/diagrams/entities`
- **THEN** the response has an `item` key containing that entity
- **AND** `groups` contains `{ key: "item", builtin: false }` with the campaign's own label for the type

#### Scenario: every declared type is reachable

- **GIVEN** a campaign declaring `character`, `location`, `faction`, `item`, `event`, `lore`, `quest`, `note` and `session`
- **WHEN** a DM calls the endpoint with no query
- **THEN** every one of those nine types is reachable through some group in the response
- **AND** no entity appears in more than one group

#### Scenario: a renamed type keeps working

- **GIVEN** a DM has renamed the campaign's `item` type to "Reliquias"
- **WHEN** a DM calls the endpoint
- **THEN** the `item` group's `label` is "Reliquias"
- **AND** the label is returned verbatim rather than as an i18n key

#### Scenario: organizations are not listed twice

- **GIVEN** a campaign whose `entity_types` declares `faction` and whose organization entities carry `entities.type = 'organization'`
- **WHEN** a DM calls the endpoint
- **THEN** each organization appears only in `organizations`
- **AND** the response has no `faction` group and no `organization` group beside it

#### Scenario: a player cannot see a DM-only object through the palette

- **GIVEN** an entity of type `item` whose `visibility` is `dm_only`
- **WHEN** a member with the `player` role calls the endpoint
- **THEN** that entity is absent from every group in the response

### Requirement: The palette renders the groups the server names

`EntityPanel` SHALL render the groups listed in the response's `groups` array, in the order given,
rather than a list of group names held in the component. A group with no entities SHALL NOT be
rendered.

For a group with `builtin: true` the component SHALL show the translated `diagrams.panel.<key>`
label. For `builtin: false` it SHALL show the server's `label` verbatim.

#### Scenario: the panel shows a group for objects

- **GIVEN** the endpoint returns an `item` group with one entity and `groups` naming it
- **WHEN** the entity panel renders
- **THEN** a group headed with the campaign's label for `item` is shown, containing that entity

#### Scenario: an unknown group needs no client change

- **GIVEN** a DM adds a new custom entity type and creates an entity of it
- **WHEN** the entity panel renders
- **THEN** that type appears as its own group with no change to the component

### Requirement: A placed non-character entity renders and survives a reload

An entity whose type has no dedicated tldraw shape SHALL be placed as the generic `entityCard`,
carrying its name, its type and its image when it has one. Reopening the diagram SHALL rehydrate
that card from `GET /api/campaigns/:id/diagrams/entities/batch`, which MUST NOT filter by entity
type.

The canvas type filter SHALL continue to treat every `entityCard` as one bucket, and its label
SHALL name that bucket generically rather than naming one type.

#### Scenario: an object placed on a diagram is still there after a reload

- **GIVEN** an object has been dropped onto a diagram and the diagram saved
- **WHEN** the diagram is reopened
- **THEN** the card shows the object's name and image, not a blank card

### Requirement: The generic entityCard shares the other card shapes' visual language

The `entityCard` shape SHALL render an entity's image full-bleed across its own image area, with
the entity's name shown in a label bar beneath that image area — the same layout every other
card-style shape (`locationPin`, `factionCard`, `npcToken`) already uses — rather than a small
fixed-size thumbnail placed beside the title with the rest of the card left blank.

This requirement governs presentation only. It does not change which shape type an entity type
maps to (`getShapeType()`'s fallback to `entityCard` for any type with no dedicated shape is
unchanged), and it MUST NOT change the rendering of `npcToken`, `locationPin`, `questNode` or
`factionCard`.

#### Scenario: an Item card looks like the rest of the board

- **GIVEN** an entity of a type with no dedicated shape (e.g. an Item) is placed on a diagram and
  carries an image
- **WHEN** the diagram renders that card
- **THEN** the image fills the card's image area edge-to-edge, not a small fixed-size square
- **AND** the entity's name appears in a label bar below the image area, not beside a thumbnail

#### Scenario: a placed object with no image yet shows a placeholder, not a broken layout

- **GIVEN** an entity of a type with no dedicated shape has been placed on a diagram and carries
  no image
- **WHEN** the diagram renders that card
- **THEN** the image area shows a centered placeholder icon
- **AND** the card's layout (image area above name bar) is unchanged from the case with an image
