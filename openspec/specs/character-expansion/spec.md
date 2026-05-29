### Requirement: Expand related entities from a character shape

The system SHALL allow a user to expand all directly related entities around a selected character entity shape on the tldraw diagram canvas.

#### Scenario: Expand button appears when a character shape is selected

- **GIVEN** the user has a tldraw diagram open
- **WHEN** the user selects a shape of type `npcToken` or `genealogyNode`
- **THEN** the "Expand related entities" button is visible in the toolbar

#### Scenario: Character expansion places missing related entities

- **GIVEN** a character entity shape is selected on the canvas
- **AND** the character has related entities in the campaign graph (via any edge type)
- **WHEN** the user clicks "Expand related entities"
- **THEN** all entities directly connected to this character that are NOT already on the canvas are placed in a radial layout around the selected shape
- **AND** `syncRelations()` is called to draw arrows connecting the new shapes to existing ones

#### Scenario: No related entities to expand

- **GIVEN** a character entity shape is selected
- **AND** the character has no related entities, or all related entities are already on the canvas
- **WHEN** the user clicks "Expand related entities"
- **THEN** no new shapes are placed
- **AND** the `onComplete` callback is invoked (triggering `syncRelations()`)

#### Scenario: Character expansion includes all edge types

- **GIVEN** a character with org-member edges, char-location edges, and entity-relation edges
- **WHEN** the user expands the character
- **THEN** the placed shapes include members of orgs the character belongs to, the character's locations, and characters/entities in direct relations with this character
