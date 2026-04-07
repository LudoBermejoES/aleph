## ADDED Requirements

### Requirement: Expand button appears for org and location selection

The diagram toolbar SHALL display an "Expand" button when exactly one organization (factionCard) or location (locationPin) shape is selected. The button SHALL be hidden for character shapes, non-entity shapes, no selection, or multi-selection.

#### Scenario: Organization selected

- **WHEN** the user selects exactly one factionCard shape
- **THEN** the "Expand" button appears in the diagram toolbar

#### Scenario: Location selected

- **WHEN** the user selects exactly one locationPin shape
- **THEN** the "Expand" button appears in the diagram toolbar

#### Scenario: Character selected

- **WHEN** the user selects exactly one npcToken shape
- **THEN** the "Expand" button is NOT visible (only "Add Relationship" appears)

#### Scenario: Nothing selected

- **WHEN** no shapes are selected
- **THEN** the "Expand" button is hidden

---

### Requirement: Expand organization creates member and location shapes

When the user clicks "Expand" with an organization selected, the system SHALL fetch the graph API, find member characters and linked locations for that org, create shapes for entities not already on canvas, and call syncRelations.

#### Scenario: Org with 3 members and 1 location

- **WHEN** the user selects an org with 3 member characters and 1 linked location, none on canvas
- **THEN** 3 npcToken shapes and 1 locationPin shape are created around the org
- **AND** syncRelations draws arrows connecting the org to each new shape

#### Scenario: Org with some members already on canvas

- **WHEN** the user selects an org with 5 members, 2 of which already have shapes on canvas
- **THEN** only 3 new npcToken shapes are created (the 2 existing ones are skipped)
- **AND** syncRelations draws arrows for all 5 connections (existing + new)

#### Scenario: Org with no related entities

- **WHEN** the user selects an org with no members and no linked locations
- **THEN** no new shapes are created
- **AND** syncRelations still runs (no-op)

---

### Requirement: Expand location creates character and organization shapes

When the user clicks "Expand" with a location selected, the system SHALL fetch the graph API, find resident characters and linked organizations, create shapes for entities not already on canvas, and call syncRelations.

#### Scenario: Location with 2 resident characters and 1 org

- **WHEN** the user selects a location with 2 characters (locationEntityId) and 1 linked org
- **THEN** 2 npcToken shapes and 1 factionCard shape are created around the location
- **AND** syncRelations draws the appropriate arrows

---

### Requirement: Expanded shapes use radial layout

Expanded shapes SHALL be positioned in a circle around the selected shape's current position using `radialLayout()` from `app/utils/diagram-layout.ts`.

#### Scenario: 4 entities expanded

- **WHEN** 4 related entities are expanded around an org at position (500, 400)
- **THEN** the new shapes are placed at evenly-spaced positions in a circle (radius ~250px) around (500, 400)

---

### Requirement: i18n for expand button

The button label SHALL use i18n keys `diagrams.expand` in en.json and es.json.

#### Scenario: Spanish locale

- **WHEN** the user's locale is Spanish
- **THEN** the button reads "Expandir"
