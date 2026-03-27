## MODIFIED Requirements

### Requirement: entity-centered graph applies to character pages

The entity-centered graph requirement SHALL apply to character detail pages in addition to entity detail pages.

#### Scenario: character page uses EntityGraphView

- **WHEN** a user views a character with relationships
- **THEN** `EntityGraphView.client.vue` is rendered on the character page
- **THEN** the graph behavior (zoom, pan, node click navigation) matches the entity page implementation
