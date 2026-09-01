## MODIFIED Requirements

### Requirement: The image is chosen from the shape own preview popover

Double-clicking a shape SHALL open the entity preview offering that entity's gallery images, with
the one currently shown marked. Choosing another SHALL apply it to **that shape** immediately.

In non-multiplayer (REST) mode, choosing an image SHALL be persisted to the server immediately as
part of handling the choice, and MUST NOT rely solely on the generic autosave debounce used for
continuous editing (dragging, resizing). A reload immediately after choosing an image, with no
separate manual save action, SHALL still show the chosen image.

The `aleph:entity-preview` event SHALL carry the `shapeId` of the shape that raised it, because one
entity may be placed as several shapes and the override addresses one of them.

A caller in read-only mode SHALL NOT be offered the picker.

#### Scenario: choosing a photograph from the popover

- **GIVEN** a card of an entity with two gallery images
- **WHEN** a DM double-clicks it and picks the other image
- **THEN** that card shows it, and the change survives a reload

#### Scenario: a choice survives an immediate reload with no manual save

- **GIVEN** a card of an entity with two gallery images, on a diagram open in REST (non-multiplayer)
  mode
- **WHEN** a DM picks the non-primary image and reloads the diagram right away, without clicking
  any save control and without waiting
- **THEN** the reloaded card still shows the chosen image
- **AND** reopening that card's popover shows the "use the main image" reset control and marks the
  chosen image as selected

#### Scenario: an entity with one image offers no choice to make

- **GIVEN** an entity with a single gallery image
- **WHEN** its card preview is opened
- **THEN** no picker is shown, or it shows one already-selected image and nothing to switch to

#### Scenario: a read-only viewer cannot change a card image

- **GIVEN** a diagram opened read-only
- **WHEN** a viewer double-clicks a card
- **THEN** no picker is reachable
