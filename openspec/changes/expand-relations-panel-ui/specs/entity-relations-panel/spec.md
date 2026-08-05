## MODIFIED Requirements

### Requirement: Relations panel on entity detail pages

The system SHALL render an `EntityRelationsPanel` component on the character, organization, location, quest, session, and arc detail pages that lists every relation involving the current entity, grouped by category (entity relations, organization membership, character-location, organization-location).

#### Scenario: Visitor sees relations panel in read-only mode

- **GIVEN** a user with the `visitor` or `player` role on a campaign
- **WHEN** they open the detail page for a character, organization, location, quest, session, or arc with existing relations
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

#### Scenario: Panel renders on a quest, session, or arc detail page

- **GIVEN** a quest, session, or arc with existing entity-relations (quests, sessions, and arcs only ever populate the generic "entity relations" group — they have no members/inhabitants/location-org groups)
- **WHEN** an editor+ opens its detail page
- **THEN** the panel renders the generic relations group with an "Add Relation" button
- **AND** relation targets link to `/campaigns/:id/:type/:slug` using the target's own entity type, so a quest/session/arc row can link back to a character, location, organization, or another quest/session/arc

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

#### Scenario: Editor submits a new relation with no relation type selected

- **GIVEN** the add-relation dialog is open with a target selected and a hand-typed forward label, but no option chosen from the "Relation Type" dropdown
- **WHEN** the editor clicks "Save"
- **THEN** `POST /api/campaigns/:id/relations` is called with `relationTypeId: null`
- **AND** the request SHALL succeed (the server falls back to the campaign's builtin `custom` relation type)
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
