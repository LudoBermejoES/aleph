## MODIFIED Requirements

### Requirement: Template editor page

The system SHALL provide an editor page for creating and editing entity templates with configurable typed fields that can be reordered.

#### Scenario: creating a template with fields

- **GIVEN** I am a campaign DM on `/campaigns/{id}/templates/new`
- **WHEN** I fill in the template name "NPC Profile" and select entity type "character"
- **AND** I add a field with key "background", label "Background", type "text", required: true
- **AND** I add a field with key "alignment", label "Alignment", type "select" with options "Lawful Good, Neutral, Chaotic Evil"
- **AND** I add a field with key "level", label "Level", type "number"
- **AND** I add a field with key "founded", label "Founded", type "date"
- **AND** I submit the form
- **THEN** the template "NPC Profile" is created with 4 fields in order
- **AND** I am navigated to the templates list

#### Scenario: editing an existing template

- **GIVEN** I am a campaign DM
- **AND** template "NPC Profile" exists with fields "Background" and "Alignment"
- **WHEN** I navigate to `/campaigns/{id}/templates/{templateId}/edit`
- **THEN** I see the template name pre-filled as "NPC Profile"
- **AND** I see the two fields listed in order with their configuration
- **WHEN** I change the template name to "NPC Character Sheet" and save
- **THEN** the template is updated

#### Scenario: adding a section field

- **GIVEN** I am editing a template
- **WHEN** I add a field with type "section" and label "Combat Stats"
- **THEN** the field appears as a section divider in the field list
- **AND** section fields do not have a "required" toggle

#### Scenario: adding an entity_reference field

- **GIVEN** I am editing a template
- **WHEN** I add a field with type "entity_reference" and label "Patron"
- **THEN** the field is configured to reference another entity in the campaign

#### Scenario: reordering fields with up/down buttons

- **GIVEN** I am editing a template with fields "Background" (0), "Alignment" (1), "Level" (2)
- **WHEN** I click the "move up" button on "Alignment"
- **THEN** the order becomes "Alignment" (0), "Background" (1), "Level" (2)
- **AND** the "move up" button is disabled on the first field
- **AND** the "move down" button is disabled on the last field

#### Scenario: removing a field

- **GIVEN** I am editing a template with fields "Background", "Alignment", "Level"
- **WHEN** I click the remove button on "Alignment"
- **THEN** "Alignment" is removed from the field list
- **AND** the remaining fields are "Background" (0), "Level" (1)

#### Scenario: field type options

- **GIVEN** I am adding a new field to a template
- **WHEN** I open the field type dropdown
- **THEN** I see options: text, number, checkbox, select, date, entity_reference, section
- **WHEN** I select "select"
- **THEN** an "Options" input appears where I can enter comma-separated values

## ADDED Requirements

### Requirement: EntityForm pre-populates existing template field values on edit

The system SHALL populate the `TemplateFieldsForm` with the entity's stored `fields` values when the entity edit form loads, so that existing values are visible and editable rather than blank.

#### Scenario: entity edit form shows existing template field values

- **GIVEN** an entity with `templateId: "tmpl-1"` and `fields: { background: "Merchant", level: 5 }`
- **WHEN** I navigate to the entity edit page
- **THEN** the template "tmpl-1" is pre-selected in the template dropdown
- **AND** the "Background" input shows "Merchant"
- **AND** the "Level" input shows "5"

#### Scenario: entity edit form with no template shows no template fields

- **GIVEN** an entity with no `templateId`
- **WHEN** I navigate to the entity edit page
- **THEN** no template fields section is rendered
