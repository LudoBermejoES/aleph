## ADDED Requirements

### Requirement: Relations panel on entity detail pages

The system SHALL render an `EntityRelationsPanel` component on the character, organization, and location detail pages that lists every relation involving the current entity, grouped by category (entity relations, organization membership, character-location, organization-location).

#### Scenario: Visitor sees relations panel in read-only mode

- **GIVEN** a user with the `visitor` or `player` role on a campaign
- **WHEN** they open the detail page for a character, organization, or location with existing relations
- **THEN** the relations panel renders the full list grouped by category
- **AND** no add, edit, or delete action buttons are visible

#### Scenario: Editor sees action buttons

- **GIVEN** a user with `editor`, `co_dm`, or `dm` role
- **WHEN** they open the detail page
- **THEN** the panel shows an "Add Relation" button at the top
- **AND** each existing relation row shows "Edit" and "Delete" buttons (or equivalent icon buttons)

#### Scenario: Panel groups relations by category

- **GIVEN** a character involved in three entity-relations, two organization memberships, and one location link
- **WHEN** the panel renders
- **THEN** the rows are grouped under headers "Relations", "Organizations", "Location"
- **AND** each group shows its row count

### Requirement: Add relation from detail page

The system SHALL let editors+ create a new relation involving the current entity without leaving the detail page.

#### Scenario: Editor opens the add-relation dialog

- **GIVEN** an editor on the character detail page for `dain-golka`
- **WHEN** they click "Add Relation"
- **THEN** a dialog opens with the source entity pre-filled and locked to `dain-golka`
- **AND** all relation modes are available (entity-relation, org-member, char-location, org-location)

#### Scenario: Editor submits a valid new relation

- **GIVEN** the add-relation dialog is open with source `dain-golka`, target `the-iron-circle` (organization), and relation type `member_of` with role `"Smith"`
- **WHEN** the editor clicks "Save"
- **THEN** `POST /api/campaigns/:id/relations` (or the equivalent membership endpoint for org-member mode) is called with the entered values
- **AND** the dialog closes on success
- **AND** the new row appears in the relations panel without a full page reload

#### Scenario: Editor cancels the dialog

- **WHEN** the editor clicks "Cancel" or presses Escape
- **THEN** the dialog closes
- **AND** no API call is made
- **AND** the panel state is unchanged

#### Scenario: Validation error blocks submit

- **GIVEN** the dialog with no target entity selected
- **WHEN** the editor clicks "Save"
- **THEN** an inline validation message appears
- **AND** no API call is made

### Requirement: Edit relation from detail page

The system SHALL let editors+ modify an existing relation's metadata directly from the relations panel.

#### Scenario: Editor opens the edit dialog for an entity-relation

- **GIVEN** the panel shows a row for relation `dain-golka` → `tark-krap` of type `ally`
- **WHEN** the editor clicks the "Edit" button on that row
- **THEN** the relation form dialog opens pre-filled with the current relation type, forward/reverse labels, attitude, and description
- **AND** the source and target entities are visible but not editable

#### Scenario: Editor saves edited entity-relation

- **GIVEN** the edit dialog is open with attitude changed from `+50` to `+80`
- **WHEN** the editor clicks "Save"
- **THEN** `PUT /api/campaigns/:id/relations/:relationId` is called with the updated body
- **AND** the row in the panel updates on success without full page reload

#### Scenario: Editor edits an org member role inline

- **GIVEN** the panel shows an organization-membership row for character `frodo` with role `Knight`
- **WHEN** the editor clicks edit, changes the role to `Commander`, and saves
- **THEN** `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId` is called with `{ role: "Commander" }`
- **AND** the row updates on success

#### Scenario: Editor edits location-link metadata inline

- **GIVEN** the panel shows a location-link row for character `frodo` at location `the-shire` with a description
- **WHEN** the editor clicks edit, modifies the description, and saves
- **THEN** `PATCH /api/campaigns/:id/locations/:slug/inhabitants/:characterId` is called with the new description
- **AND** the row updates on success

### Requirement: Delete relation from detail page

The system SHALL let editors+ delete an existing relation involving the current entity from the panel, with confirmation.

#### Scenario: Editor confirms deletion of an entity-relation

- **GIVEN** the panel shows a row for an entity-relation
- **WHEN** the editor clicks "Delete" and confirms the action in the confirmation prompt
- **THEN** `DELETE /api/campaigns/:id/relations/:relationId` is called
- **AND** the row is removed from the panel on success
- **AND** a success notification is shown

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

### Requirement: Panel refresh after mutation

The system SHALL refresh the panel's data after a successful add, edit, or delete so that the displayed state matches the server.

#### Scenario: Panel refetches after add

- **WHEN** a new relation is created
- **THEN** the panel issues a fresh GET to load the current list of relations for the source entity
- **AND** the resulting list reflects the new row

#### Scenario: Other tabs on the same page refresh

- **GIVEN** the character detail page has both the new relations panel and the existing read-only Relations tab
- **WHEN** the user adds a relation in the panel
- **THEN** the Relations tab also shows the new row on next render (shared data source or refetch on mutation event)

### Requirement: Permission enforcement on PATCH endpoints

The system SHALL enforce `editor+` role on the new PATCH endpoints introduced to support inline metadata edits.

#### Scenario: Player attempts member role PATCH

- **GIVEN** a user with the `player` role
- **WHEN** they send `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId`
- **THEN** the server responds `403 Forbidden`
- **AND** no data is modified

#### Scenario: Unauthenticated PATCH request

- **GIVEN** no session cookie and no `X-API-Key` header
- **WHEN** any of the new PATCH endpoints is called
- **THEN** the server responds `401 Unauthorized`

#### Scenario: Editor PATCHes member role successfully

- **GIVEN** an editor with valid session
- **WHEN** they PATCH a member role to `"Commander"`
- **THEN** the server responds `200 OK` with the updated membership object
- **AND** a subsequent GET reflects the new role

### Requirement: i18n coverage for panel strings

The system SHALL provide English and Spanish translations for every panel label, button, dialog title, and confirmation message.

#### Scenario: Locale keys exist in both files

- **WHEN** the panel renders with locale `en` or `es`
- **THEN** no untranslated keys appear in the UI
- **AND** the same set of keys exists in `i18n/locales/en.json` and `i18n/locales/es.json`
