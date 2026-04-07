## ADDED Requirements

### Requirement: Add Relationship button appears on entity selection

The diagram toolbar SHALL display an "Add Relationship" button when exactly one entity shape (npcToken, factionCard, or locationPin) is selected on the tldraw canvas. The button SHALL be hidden when zero shapes, multiple shapes, or non-entity shapes (arrows, regionBox, stickyNote, etc.) are selected.

#### Scenario: Single entity shape selected

- **WHEN** the user selects exactly one npcToken shape on the canvas
- **THEN** the "Add Relationship" button appears in the diagram toolbar

#### Scenario: Single factionCard shape selected

- **WHEN** the user selects exactly one factionCard (organization) shape
- **THEN** the "Add Relationship" button appears in the diagram toolbar

#### Scenario: Single locationPin shape selected

- **WHEN** the user selects exactly one locationPin shape
- **THEN** the "Add Relationship" button appears in the diagram toolbar

#### Scenario: No selection

- **WHEN** the user deselects all shapes (clicks on empty canvas)
- **THEN** the "Add Relationship" button is hidden

#### Scenario: Multiple shapes selected

- **WHEN** the user selects two or more shapes
- **THEN** the "Add Relationship" button is hidden

#### Scenario: Non-entity shape selected

- **WHEN** the user selects an arrow, stickyNote, regionBox, or canvasLabel shape
- **THEN** the "Add Relationship" button is hidden

---

### Requirement: Relationship dialog opens with source entity pre-filled

When the user clicks "Add Relationship", the system SHALL open a modal dialog with the selected entity shown as the source. The dialog SHALL display the entity name, type, and portrait (if available).

#### Scenario: Dialog opens from npcToken

- **WHEN** the user selects a npcToken (character) and clicks "Add Relationship"
- **THEN** a modal dialog opens showing the character's name and portrait as the source entity

#### Scenario: Dialog opens from factionCard

- **WHEN** the user selects a factionCard (organization) and clicks "Add Relationship"
- **THEN** a modal dialog opens showing the organization's name as the source entity

---

### Requirement: Target entity picker with search

The dialog SHALL provide a searchable dropdown/combobox for selecting the target entity. The picker SHALL fetch results from `GET /api/campaigns/:id/diagrams/entities?q=<query>` with debounced input (300ms). Results SHALL be grouped by entity type (Characters, Locations, Organizations).

#### Scenario: Search for target entity

- **WHEN** the user types "Diana" into the target entity search field
- **THEN** the dropdown shows matching entities grouped by type, fetched from the diagrams/entities endpoint

#### Scenario: Select target entity

- **WHEN** the user selects "Hotman" from the dropdown results
- **THEN** the target entity is set and the form fields update based on the source→target type pair

#### Scenario: Empty search shows all entities

- **WHEN** the user opens the target picker without typing
- **THEN** the dropdown shows the first batch of entities from all types

---

### Requirement: Character-to-character relation form

When source and target are both characters, the dialog SHALL show entity-relation fields: a relation type dropdown (fetched from `GET /api/campaigns/:id/relation-types`), editable forward/reverse labels, and an attitude slider (-100 to +100).

#### Scenario: Character-to-character relation type picker

- **WHEN** source is a character and target is a character
- **THEN** the form shows a relation type dropdown populated from the campaign's relation types

#### Scenario: Labels auto-fill from relation type

- **WHEN** the user selects the "ally" relation type
- **THEN** the forward and reverse label fields auto-fill with the relation type's default labels

#### Scenario: Submit character-to-character relation

- **WHEN** the user fills in the form and clicks "Create"
- **THEN** the system calls `POST /api/campaigns/:id/relations` with `{ sourceEntityId, targetEntityId, relationTypeId, forwardLabel, reverseLabel, attitude }`
- **AND** on success, calls `syncRelations()` to draw the arrow on canvas
- **AND** closes the dialog

---

### Requirement: Character-to-organization membership form

When source is a character and target is an organization (or vice versa), the dialog SHALL show an organization membership form with an optional role text field.

#### Scenario: Character-to-organization membership

- **WHEN** source is a character and target is an organization
- **THEN** the form shows a "Role" text input field (optional)

#### Scenario: Organization-to-character membership (reversed)

- **WHEN** source is an organization and target is a character
- **THEN** the form shows the same membership form (system internally swaps to character→org)

#### Scenario: Submit membership

- **WHEN** the user fills in the role (or leaves empty) and clicks "Create"
- **THEN** the system calls `POST /api/campaigns/:id/organizations/:orgSlug/members` with `{ characterId, role }`
- **AND** on success, calls `syncRelations()` and closes the dialog

#### Scenario: Character ID resolution

- **WHEN** the system needs to add a character as org member
- **THEN** it resolves the entity's slug to a character record via `GET /api/campaigns/:id/characters/:slug` to obtain the `characterId` field required by the members API

---

### Requirement: Character-to-location link form

When source is a character and target is a location (or vice versa), the dialog SHALL show a confirmation form that sets the character's `locationEntityId`.

#### Scenario: Character-to-location

- **WHEN** source is a character and target is a location
- **THEN** the form shows a confirmation message: "Set [character name]'s location to [location name]"

#### Scenario: Location-to-character (reversed)

- **WHEN** source is a location and target is a character
- **THEN** the form shows the same confirmation (system internally treats character as the entity being updated)

#### Scenario: Submit character location

- **WHEN** the user clicks "Create"
- **THEN** the system calls `PUT /api/campaigns/:id/characters/:charSlug` with `{ locationEntityId: targetEntityId }`
- **AND** on success, calls `syncRelations()` and closes the dialog

---

### Requirement: Organization-to-location link form

When source is an organization and target is a location (or vice versa), the dialog SHALL show a confirmation form that links the organization to the location.

#### Scenario: Organization-to-location

- **WHEN** source is an organization and target is a location
- **THEN** the form shows a confirmation message: "Link [org name] to [location name]"

#### Scenario: Location-to-organization (reversed)

- **WHEN** source is a location and target is an organization
- **THEN** the form shows the same confirmation (system swaps internally)

#### Scenario: Submit org-location link

- **WHEN** the user clicks "Create"
- **THEN** the system calls `POST /api/campaigns/:id/locations/:locSlug/organizations` with `{ organizationId }`
- **AND** on success, calls `syncRelations()` and closes the dialog

---

### Requirement: Error handling and validation

The dialog SHALL handle API errors gracefully and prevent invalid submissions.

#### Scenario: Target not selected

- **WHEN** the user clicks "Create" without selecting a target entity
- **THEN** the create button is disabled (cannot submit)

#### Scenario: API error

- **WHEN** the relationship creation API returns an error (e.g., 409 duplicate member)
- **THEN** the dialog displays an error message and does not close

#### Scenario: Same entity as source and target

- **WHEN** the user selects the same entity as both source and target
- **THEN** the create button is disabled with a validation message

---

### Requirement: i18n support

All dialog labels, button text, and messages SHALL use i18n keys from `i18n/locales/en.json` and `i18n/locales/es.json`.

#### Scenario: Dialog labels are translated

- **WHEN** the user's locale is set to Spanish
- **THEN** all dialog text (title, labels, buttons, messages) appears in Spanish
