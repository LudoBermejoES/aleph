## ADDED Requirements

### Requirement: A Pin's Custom Label SHALL Override the Linked Entity's Live Name

When a pin's `label` is a deliberately-set, non-null value, it SHALL take priority over the linked
entity's current name when the pin's display name is resolved. When `label` is null, the linked
entity's current name SHALL be used. When neither is available, a placeholder SHALL be used.

A label SHALL only be considered "deliberately set" if it was written through an explicit rename
(this change) or survives the one-off migration described below — pin creation SHALL NOT itself write
a copy of the entity's name into `label`.

#### Scenario: A renamed pin keeps its name after the entity is renamed again

- **WHEN** a pin has a non-null `label` set by an explicit rename
- **AND** the linked entity is renamed afterward
- **THEN** the pin continues to display its own `label`, not the entity's new name

#### Scenario: An un-renamed pin follows its entity

- **WHEN** a pin's `label` is null
- **AND** its linked entity is renamed
- **THEN** the pin's displayed name updates to the entity's new name without any write to the pin

#### Scenario: A pin with no linked entity

- **WHEN** a pin has no `entityId`
- **THEN** its `label` (or the placeholder, if also null) is displayed, since there is no entity name
  to fall back to

### Requirement: Pin Creation SHALL NOT Copy the Linked Entity's Name Into `label`

Creating a pin (via the UI's drag-and-drop or the CLI's `pin-add`) SHALL leave `label` null unless the
caller explicitly supplies one. `pin-add`'s `--label` SHALL be optional.

#### Scenario: Dropping an entity onto the map

- **WHEN** an editor drags an entity from the entity picker and drops it on the map
- **THEN** the created pin's `label` is null
- **AND** its displayed name is the entity's current name, resolved live

#### Scenario: `pin-add` without `--label`

- **WHEN** `pin-add` is invoked without `--label`
- **THEN** the request succeeds and the created pin's `label` is null

### Requirement: A Pin's Label SHALL Be Editable Through the Existing Move Endpoint

`PATCH .../pins/[pinId]` SHALL accept an optional `label` field in addition to its existing optional
`lat`/`lng` pair, gated to editor role or above like the rest of that endpoint. At least one of
`{lat, lng}` (given together) or `label` SHALL be present in the request body, or the request SHALL be
rejected. `color` and `entityId` sent in the same body SHALL continue to be silently ignored, as
before this change.

Sending an empty (or all-whitespace) `label` SHALL clear it to `null`, not store an empty string —
clearing a pin's custom name SHALL mean "resolve its display name from the linked entity again".

The endpoint SHALL continue to return the updated pin in the same shape the pin-listing endpoint
returns.

#### Scenario: Renaming alongside a move

- **WHEN** an editor PATCHes a pin with `{ lat, lng, label }`
- **THEN** both the coordinates and the label are persisted

#### Scenario: Renaming without moving

- **WHEN** an editor PATCHes a pin with only `{ label }`
- **THEN** the label is persisted and the pin's coordinates are unchanged

#### Scenario: Moving without renaming

- **WHEN** an editor PATCHes a pin with only `{ lat, lng }`
- **THEN** the coordinates are persisted and any existing label is unchanged

#### Scenario: Color and entity are still not accepted

- **WHEN** a PATCH body includes `color` or `entityId` alongside a valid `label` or coordinate pair
- **THEN** the pin's colour and linked entity are unchanged

#### Scenario: Clearing a label

- **WHEN** an editor PATCHes a pin with `{ label: '' }`
- **THEN** the pin's stored `label` becomes `null`
- **AND** its displayed name is now resolved from its linked entity, if any

#### Scenario: An empty request body

- **WHEN** a PATCH body carries none of `lat`, `lng`, or `label`
- **THEN** the request is rejected rather than silently doing nothing

#### Scenario: A viewer below editor

- **WHEN** a user without editor permission requests a label change
- **THEN** the request is refused

### Requirement: Existing Pins Whose Label Merely Duplicates Their Entity's Name SHALL Be Migrated

On startup, a one-off, idempotent backfill SHALL null any `mapPins.label` that equals (trimmed,
case-insensitively) its linked entity's current name, so that pins whose label is indistinguishable
from a stale copy correctly resume following the live entity name rather than being treated as
deliberately renamed. Pins with no linked entity, and pins whose label differs from their entity's
current name, SHALL be left unchanged.

#### Scenario: A label that matches its entity's name

- **WHEN** the backfill runs
- **AND** a pin's `label` equals its linked entity's current name, ignoring case and surrounding
  whitespace
- **THEN** the pin's `label` is set to `null`

#### Scenario: A label that differs from its entity's name

- **WHEN** the backfill runs
- **AND** a pin's `label` does not equal its linked entity's current name
- **THEN** the pin's `label` is left unchanged

#### Scenario: A pin with no linked entity

- **WHEN** the backfill runs
- **AND** a pin has no `entityId`
- **THEN** the pin's `label` is left unchanged

#### Scenario: Running it twice

- **WHEN** the backfill runs a second time after the first
- **THEN** it makes no further changes

### Requirement: Renaming a Pin SHALL Have a CLI Command and a UI Affordance

The CLI SHALL expose a command that renames a pin via the same endpoint, so every pin operation
reachable from the UI is also reachable without a browser. The pins list under a map SHALL offer an
edit affordance next to its existing delete affordance, visible under the same editor-or-above gate,
and renaming SHALL NOT rebuild the map or close an open popup.

#### Scenario: CLI rename

- **WHEN** `map pin-rename --pin <id> --label <label>` is run by an editor or above
- **THEN** the pin's label is updated via the PATCH endpoint and the result is printed

#### Scenario: CLI clear

- **WHEN** `map pin-rename --pin <id> --label ""` is run
- **THEN** the pin's label is cleared and its display name reverts to the linked entity's name

#### Scenario: Editing from the pins list

- **WHEN** an editor or above clicks the edit affordance next to a pin in the pins list and confirms a
  new name
- **THEN** the pin's label is updated
- **AND** the map is not rebuilt (no marker flicker, no popup closed)
- **AND** a viewer below editor sees no edit affordance
