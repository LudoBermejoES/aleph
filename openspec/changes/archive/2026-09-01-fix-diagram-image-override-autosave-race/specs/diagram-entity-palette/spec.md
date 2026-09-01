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

In multiplayer (sync) mode, the server-side shape schema used by the sync room MUST accept
`imageOverrideId` on every shape type that carries it client-side, and MUST NOT silently drop the
socket session on a valid choice. A shape that never carries the override MUST still be rejected.

#### Scenario: choosing an image is accepted over an active multiplayer sync connection

- **GIVEN** a diagram open with multiplayer sync active (`NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true`,
  the production configuration)
- **WHEN** a DM picks a non-primary image on a card whose shape type carries `imageOverrideId`
- **THEN** the sync room accepts the change and does not reject the session
- **AND** a client that reconnects to the same room afterward (the sync-mode equivalent of a
  reload) sees the chosen image, not the primary one

#### Scenario: a rejected sync session is observably closed, not silently hung

- **GIVEN** a diagram open with multiplayer sync active
- **WHEN** the sync room fatally rejects a push (for any reason, e.g. an unknown shape property)
- **THEN** the underlying connection to that client is actually closed, so the client's own
  connection-status indicator can react
- **AND** the rejection MUST NOT leave the socket open with no further response, which would look
  "connected" to the user while nothing after that point is saved

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
