## MODIFIED Requirements

### Requirement: Character detail page has a delete action

The character detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/characters/:slug` on confirmation, then redirects to the character list. The button SHALL remain in the header block (always visible, outside the tab layout).

#### Scenario: DM can delete a character from the detail page

- **WHEN** a DM views a character detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the character is deleted
- **AND** the user is redirected to `/campaigns/:id/characters`
