## MODIFIED Requirements

### Requirement: character detail page shows visual relationship graph

The character detail page SHALL include a visual relationship graph section that fulfils the entity-centered graph requirement from the relationship-graph spec.

#### Scenario: graph section present on character page

- **WHEN** a user views a character detail page with at least one relation or connection
- **THEN** a graph section labeled with `characters.graph` i18n key is visible below the Relations list
- **THEN** it uses the same `EntityGraphView` component used on entity pages
