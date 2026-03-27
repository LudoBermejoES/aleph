## ADDED Requirements

### Requirement: Organization locations panel

The system SHALL display and manage the locations where an organization has a presence, on the organization detail page.

#### Scenario: Locations panel on organization detail
- **GIVEN** a user views `/campaigns/:id/organizations/:slug`
- **THEN** a "Locations" panel is shown listing all locations linked to the organization via `entity_relations` with `relationType = 'located_in'`
- **AND** each location shows its name (linked to its detail page) and subtype badge

#### Scenario: Add location to organization from detail page
- **GIVEN** an editor+ is viewing an organization detail page
- **WHEN** they select a location from the locations panel dropdown and click "Add Location"
- **THEN** an `entity_relations` row is created with `relationType = 'located_in'` linking the organization's entity to the location
- **AND** the location appears in the panel

#### Scenario: Remove location from organization
- **GIVEN** an editor+ is viewing an organization detail page with linked locations
- **WHEN** they click "Remove" next to a location
- **THEN** the `entity_relations` row is deleted
- **AND** the location is removed from the panel
