## ADDED Requirements

### Requirement: Entity (wiki page) detail has a delete action

The entity detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/entities/:slug` on confirmation, then redirects to the entity list.

#### Scenario: DM can delete a wiki entity from the detail page

- **WHEN** a DM views an entity detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the entity is deleted
- **AND** the user is redirected to `/campaigns/:id/entities`
