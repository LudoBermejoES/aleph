## MODIFIED Requirements

### Requirement: Delete relation from detail page

The system SHALL let editors+ delete an existing relation involving the current entity from the
panel, with confirmation. The confirmation prompt SHALL be exposed to assistive technology as an
alert dialog (`role="alertdialog"`), because it warns of a destructive, irreversible action.

#### Scenario: Editor confirms deletion of an entity-relation

- **GIVEN** the panel shows a row for an entity-relation
- **WHEN** the editor clicks "Delete" and confirms the action in the confirmation prompt
- **THEN** `DELETE /api/campaigns/:id/relations/:relationId` is called
- **AND** the row is removed from the panel on success
- **AND** a success notification is shown

#### Scenario: The confirmation prompt is reachable as an alert dialog

- **GIVEN** the editor clicked "Delete" and the confirmation prompt is open
- **WHEN** the rendered DOM is inspected (or queried by a screen reader / accessibility tree)
- **THEN** the confirmation prompt's root element carries `role="alertdialog"`, not merely
  `role="dialog"` — a caller passing `role="alertdialog"` to the shared dialog wrapper SHALL have
  that attribute actually reach the rendered element, not silently fall through to `$attrs` on a
  Teleport root with nothing to receive it

#### Scenario: Editor cancels deletion

- **WHEN** the editor clicks "Delete" but cancels the confirmation
- **THEN** no API call is made
- **AND** the panel state is unchanged

#### Scenario: Deletion of an org-member row removes the membership

- **GIVEN** the panel shows an organization-membership row
- **WHEN** the editor confirms deletion
- **THEN** `DELETE /api/campaigns/:id/organizations/:slug/members/:characterId` is called
- **AND** the row disappears

#### Scenario: Deletion of a location-link row removes the link

- **GIVEN** the panel shows a character-location row
- **WHEN** the editor confirms deletion
- **THEN** `DELETE /api/campaigns/:id/locations/:slug/inhabitants/:characterId` is called
- **AND** the row disappears
