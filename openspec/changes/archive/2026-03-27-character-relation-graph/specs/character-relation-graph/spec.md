## ADDED Requirements

### Requirement: character graph panel

The character detail page SHALL display an interactive relationship graph when the character has at least one entity relation or character connection.

#### Scenario: graph renders with relations and connections

- **WHEN** a character has entity relations and/or character connections
- **THEN** an `EntityGraphView` graph appears below the Relations section
- **THEN** the character is the center node (blue, type `character`)
- **THEN** each entity relation appears as an edge labeled with the perspective-resolved label and colored by attitude score
- **THEN** each character connection appears as a gray edge labeled with the connection label

#### Scenario: graph hidden when no relationships

- **WHEN** a character has zero relations and zero connections
- **THEN** no graph section is rendered

#### Scenario: node click navigates to character page

- **WHEN** the user clicks a node whose entity type is `character`
- **THEN** the app navigates to `/campaigns/[id]/characters/[slug]`

#### Scenario: node click navigates to entity page

- **WHEN** the user clicks a node whose entity type is not `character`
- **THEN** the app navigates to `/campaigns/[id]/entities/[slug]`

#### Scenario: attitude color on relation edges

- **WHEN** a relation has a positive attitude score
- **THEN** the edge is colored green
- **WHEN** a relation has a negative attitude score
- **THEN** the edge is colored red
- **WHEN** attitude is zero or null
- **THEN** the edge is colored gray (`#9ca3af`)
