## MODIFIED Requirements

### Requirement: Revoke an API key

Users SHALL be able to revoke any of their keys from the settings page. Clicking "Revoke" SHALL
NOT throw, regardless of async timing — the confirmation and the delete call happen inside the
same component instance's lifetime, not after it.

#### Scenario: Revoke with confirmation

- **WHEN** a user clicks "Revoke" on a key
- **THEN** a confirmation dialog appears warning that the key will stop working immediately
- **AND** on confirmation the UI calls `DELETE /api/apikeys/:id`
- **AND** the key is removed from the list

#### Scenario: Revoke cancellation

- **WHEN** a user clicks "Revoke" but cancels the confirmation dialog
- **THEN** the key remains in the list unchanged
- **AND** no `DELETE` request is made

#### Scenario: Revoking does not throw a component-lifecycle error

- **WHEN** a user clicks "Revoke" on a key, with or without confirming
- **THEN** no localization/composable call inside the handler throws a "must be called at the top
  of a setup function" error, because every composable the handler depends on is resolved at the
  top of the component's `setup()`, not lazily inside the async handler
