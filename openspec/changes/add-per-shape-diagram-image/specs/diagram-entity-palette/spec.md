## ADDED Requirements

### Requirement: A diagram card can show any of its entity images

A shape that displays an entity's image SHALL accept an optional `imageOverrideId` naming one image
from that entity's gallery. The shape SHALL render that image instead of the entity's primary.

The override SHALL be **per shape**: two shapes of the same entity on one canvas, or on two
diagrams, SHALL be able to show different images. Setting an override MUST NOT change the entity's
primary image, and MUST NOT affect any other shape.

`imageOverrideId` MUST be declared as an **optional** shape prop, so a snapshot saved before this
change still loads.

#### Scenario: two cards of the same character show different photographs

- **GIVEN** a character with gallery images A (primary) and B, placed twice on one diagram
- **WHEN** one card is set to B
- **THEN** that card shows B and the other still shows A
- **AND** the character's primary image is still A

#### Scenario: a diagram saved before this feature still opens

- **GIVEN** a diagram snapshot whose shapes carry no `imageOverrideId`
- **WHEN** it is opened
- **THEN** it loads and every card shows its entity's primary image

### Requirement: Hydration respects an override and falls back when it cannot

On loading a diagram, the system SHALL resolve each shape's image as follows: if the shape carries
an `imageOverrideId` **and** that id is present in the entity's gallery, the shape SHALL show that
image; otherwise the shape SHALL show the entity's primary image.

Hydration MUST NOT overwrite a valid override with the primary. An `imageOverrideId` that no longer
resolves — a deleted image — MUST degrade to the primary and MUST NOT leave a broken image; the
stale override MAY remain stored.

`GET /api/campaigns/:id/diagrams/entities/batch` SHALL return, per entity, `images: { id, url }[]`
listing that entity's gallery, subject to the same `dm_only` visibility rule as the rest of that
endpoint response.

#### Scenario: an override survives a reload

- **GIVEN** a card set to a non-primary image, and the diagram saved
- **WHEN** the diagram is reopened
- **THEN** the card still shows the chosen image

#### Scenario: a deleted image falls back to the primary

- **GIVEN** a card whose `imageOverrideId` names an image that has since been deleted
- **WHEN** the diagram is opened
- **THEN** the card shows the entity's primary image, not a broken image

#### Scenario: changing the primary still moves every card that has no override

- **GIVEN** two cards of one character, one with an override and one without
- **WHEN** the character's primary image is changed
- **THEN** the card with no override shows the new primary and the overridden card is unchanged

#### Scenario: a player does not receive the images of a dm_only entity

- **WHEN** a member with the `player` role calls `batch` for a `dm_only` entity
- **THEN** that entity is absent from the response, images included

### Requirement: The image is chosen from the shape own preview popover

Double-clicking a shape SHALL open the entity preview offering that entity's gallery images, with
the one currently shown marked. Choosing another SHALL apply it to **that shape** immediately and
persist it with the diagram.

The `aleph:entity-preview` event SHALL carry the `shapeId` of the shape that raised it, because one
entity may be placed as several shapes and the override addresses one of them.

A caller in read-only mode SHALL NOT be offered the picker.

#### Scenario: choosing a photograph from the popover

- **GIVEN** a card of an entity with two gallery images
- **WHEN** a DM double-clicks it and picks the other image
- **THEN** that card shows it, and the change survives a reload

#### Scenario: an entity with one image offers no choice to make

- **GIVEN** an entity with a single gallery image
- **WHEN** its card preview is opened
- **THEN** no picker is shown, or it shows one already-selected image and nothing to switch to

#### Scenario: a read-only viewer cannot change a card image

- **GIVEN** a diagram opened read-only
- **WHEN** a viewer double-clicks a card
- **THEN** no picker is reachable

### Requirement: An organization card refreshes its crest

Hydration SHALL set `crestUrl` on a `factionCard` from the organization's resolved image, by the
same override-then-primary rule as every other shape. Today it sets only `factionName`, so a card
keeps the crest it was dropped with for ever.

#### Scenario: changing an organization image updates cards already on a diagram

- **GIVEN** an organization card on a saved diagram
- **WHEN** the organization's image is changed and the diagram reopened
- **THEN** the card shows the new crest
