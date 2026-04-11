## ADDED Requirements

### Requirement: Delete button on entity detail page

The entity detail page SHALL display a Delete button visible only to users with `dm` or `co_dm` role. Clicking it SHALL prompt for confirmation before calling `DELETE /api/campaigns/:id/entities/:slug`. On success the user SHALL be redirected to the entity list page.

#### Scenario: DM sees delete button on entity detail

- **WHEN** a DM views an entity detail page
- **THEN** a destructive Delete button is visible in the page actions area

#### Scenario: Editor does not see delete button on entity detail

- **WHEN** a user with `editor` role views an entity detail page
- **THEN** no Delete button is rendered

#### Scenario: Confirming delete removes entity and redirects

- **WHEN** a DM clicks Delete and confirms the dialog
- **THEN** `DELETE /api/campaigns/:id/entities/:slug` is called
- **AND** the user is redirected to `/campaigns/:id/entities`

#### Scenario: Cancelling delete does nothing

- **WHEN** a DM clicks Delete and cancels the confirmation dialog
- **THEN** the entity is not deleted and the user stays on the detail page

### Requirement: Delete button on character detail page

The character detail page SHALL display a Delete button visible only to `dm` or `co_dm` roles. Clicking it SHALL prompt for confirmation before calling `DELETE /api/campaigns/:id/characters/:slug`. On success the user SHALL be redirected to the character list page.

#### Scenario: DM sees delete button on character detail

- **WHEN** a DM views a character detail page
- **THEN** a destructive Delete button is visible

#### Scenario: Confirming delete removes character and redirects

- **WHEN** a DM clicks Delete and confirms
- **THEN** `DELETE /api/campaigns/:id/characters/:slug` is called
- **AND** the user is redirected to `/campaigns/:id/characters`

### Requirement: Delete button on map detail page

The map detail page SHALL display a Delete button visible only to `dm` or `co_dm` roles. Clicking it SHALL prompt for confirmation before calling `DELETE /api/campaigns/:id/maps/:slug`. On success the user SHALL be redirected to the map list page.

#### Scenario: DM sees delete button on map detail

- **WHEN** a DM views a map detail page
- **THEN** a destructive Delete button is visible

#### Scenario: Confirming delete removes map and redirects

- **WHEN** a DM clicks Delete and confirms
- **THEN** `DELETE /api/campaigns/:id/maps/:slug` is called
- **AND** the user is redirected to `/campaigns/:id/maps`

### Requirement: Delete button on organization detail page

The organization detail page SHALL display a Delete button visible only to `dm` or `co_dm` roles. Clicking it SHALL prompt for confirmation before calling `DELETE /api/campaigns/:id/organizations/:slug`. On success the user SHALL be redirected to the organization list page.

#### Scenario: DM sees delete button on organization detail

- **WHEN** a DM views an organization detail page
- **THEN** a destructive Delete button is visible

#### Scenario: Confirming delete removes organization and redirects

- **WHEN** a DM clicks Delete and confirms
- **THEN** `DELETE /api/campaigns/:id/organizations/:slug` is called
- **AND** the user is redirected to `/campaigns/:id/organizations`
