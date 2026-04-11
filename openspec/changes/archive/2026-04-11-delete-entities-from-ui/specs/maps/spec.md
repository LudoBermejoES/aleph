## ADDED Requirements

### Requirement: Map detail page has a delete action

The map detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/maps/:slug` on confirmation, then redirects to the map list. The server-side handler already removes associated tiles and files.

#### Scenario: DM can delete a map from the detail page

- **WHEN** a DM views a map detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the map and its tiles are deleted
- **AND** the user is redirected to `/campaigns/:id/maps`
