# api-key-settings-ui Specification

## Purpose

The "API Keys" section of the user settings page, where a user generates a named API key and revokes any of their own keys.

## Requirements

### Requirement: API Keys settings section

The user settings page SHALL include an "API Keys" section where users can manage their keys.

#### Scenario: Keys section visible

- **WHEN** a logged-in user navigates to their settings page
- **THEN** an "API Keys" section is visible listing all existing keys

#### Scenario: Empty state

- **WHEN** a user has no keys
- **THEN** the section shows an empty state message prompting them to create their first key

---

### Requirement: Generate a new API key

Users SHALL be able to create a named API key from the settings page.

#### Scenario: Create key flow

- **WHEN** a user fills in a key name and clicks "Generate Key"
- **THEN** the UI calls `POST /api/apikeys` and displays the raw key in a one-time modal
- **AND** the modal includes a copy-to-clipboard button
- **AND** a warning states "This key will not be shown again"

#### Scenario: Key appears in list after creation

- **WHEN** the user closes the one-time modal
- **THEN** the new key appears in the list showing name, prefix, and creation date
- **AND** the raw key is no longer accessible

#### Scenario: Empty name rejected

- **WHEN** a user attempts to generate a key without a name
- **THEN** the form shows a validation error and does not submit

---

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
