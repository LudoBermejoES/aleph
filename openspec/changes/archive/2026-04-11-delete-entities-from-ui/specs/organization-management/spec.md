## ADDED Requirements

### Requirement: Organization detail page has a delete action

The organization detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/organizations/:slug` on confirmation, then redirects to the organization list.

#### Scenario: DM can delete an organization from the detail page

- **WHEN** a DM views an organization detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the organization is deleted
- **AND** the user is redirected to `/campaigns/:id/organizations`
